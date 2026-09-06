import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.scale_up import (
    ScaleUpDecision,
    ScaleUpPlan,
    ScaleTarget,
    ScalePhase,
    ImpactMetric,
    ImpactDirection,
    ScaleOutcomeType,
)


class ScaleCalculationService:
    """
    Deterministic mathematical calculation engine for Step 9 scale-up progress,
    budget verification, and normalized impact scoring.
    """

    @staticmethod
    def generate_scale_code(db: Session) -> str:
        """Generates sequential SCALE-YYYY-XXXX scale decision code."""
        year = datetime.now(timezone.utc).year
        prefix = f"SCALE-{year}-"
        count = (
            db.query(func.count(ScaleUpDecision.id))
            .filter(ScaleUpDecision.scale_up_code.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def generate_plan_code(db: Session) -> str:
        """Generates sequential PLAN-YYYY-XXXX scale plan code."""
        year = datetime.now(timezone.utc).year
        prefix = f"PLAN-{year}-"
        count = (
            db.query(func.count(ScaleUpPlan.id))
            .filter(ScaleUpPlan.plan_code.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def calculate_phase_progress(phases: List[ScalePhase]) -> float:
        """
        Calculates aggregate rollout progress from phases:
        Progress = SUM(phase_weight * completion_percentage / 100)
        Normalized to 0.0 - 100.0%.
        """
        if not phases:
            return 0.0

        total_weight = sum(getattr(p, "weight", 1.0) or 1.0 for p in phases)
        if total_weight <= 0:
            total_weight = float(len(phases))

        # Check if weights are calibrated out of 100 or relative
        weighted_sum = sum(
            (getattr(p, "weight", 1.0) or 1.0) * (p.completion_percentage or 0.0)
            for p in phases
        )
        progress = weighted_sum / total_weight
        return max(0.0, min(100.0, round(float(progress), 2)))

    @staticmethod
    def calculate_target_progress(targets: List[ScaleTarget]) -> float:
        """
        Calculates target deployment progress:
        Progress = (completed_targets / total_targets) * 100
        Normalized to 0.0 - 100.0%.
        """
        if not targets:
            return 0.0

        completed = sum(
            1 for t in targets if str(t.status).upper() == "COMPLETED" or (t.progress_percentage or 0.0) >= 100.0
        )
        progress = (completed / len(targets)) * 100.0
        return max(0.0, min(100.0, round(float(progress), 2)))

    @staticmethod
    def normalize_impact_metric_score(
        actual: Optional[float],
        target: float,
        baseline: Optional[float] = None,
        direction: str = "HIGHER_IS_BETTER",
    ) -> float:
        """
        Normalizes single impact metric score to strictly [0.0, 100.0].
        Adheres to product rule: one metric cannot exceed 100 and mask failures elsewhere.
        """
        if actual is None or target is None:
            return 0.0

        dir_str = str(direction).upper()

        if dir_str == ImpactDirection.HIGHER_IS_BETTER.value or dir_str == "HIGHER_IS_BETTER":
            if baseline is not None and baseline != target:
                delta_target = target - baseline
                delta_actual = actual - baseline
                if delta_target > 0:
                    pct = (delta_actual / delta_target) * 100.0
                else:
                    pct = (actual / target) * 100.0 if target > 0 else 0.0
            else:
                pct = (actual / target) * 100.0 if target > 0 else (100.0 if actual >= target else 0.0)

        elif dir_str == ImpactDirection.LOWER_IS_BETTER.value or dir_str == "LOWER_IS_BETTER":
            if baseline is not None and baseline != target:
                delta_target = baseline - target
                delta_actual = baseline - actual
                if delta_target > 0:
                    pct = (delta_actual / delta_target) * 100.0
                else:
                    pct = (target / actual) * 100.0 if actual > 0 else 100.0
            else:
                pct = (target / actual) * 100.0 if actual > 0 else (100.0 if actual <= target else 0.0)

        elif dir_str == ImpactDirection.TARGET_EXACT.value or dir_str == "TARGET_EXACT":
            if target != 0:
                diff = abs(actual - target)
                pct = max(0.0, (1.0 - (diff / abs(target))) * 100.0)
            else:
                pct = 100.0 if math.isclose(actual, target, abs_tol=1e-5) else 0.0

        elif dir_str == ImpactDirection.RANGE_BOUND.value or dir_str == "RANGE_BOUND":
            low = min(baseline or 0.0, target)
            high = max(baseline or 0.0, target)
            if low <= actual <= high:
                pct = 100.0
            else:
                dist = min(abs(actual - low), abs(actual - high))
                span = max(1.0, high - low)
                pct = max(0.0, (1.0 - (dist / span)) * 100.0)

        else:
            pct = (actual / target) * 100.0 if target > 0 else 0.0

        # Strictly normalize between 0.0 and 100.0
        return max(0.0, min(100.0, round(float(pct), 2)))

    @classmethod
    def calculate_overall_impact_score(
        cls,
        metrics: List[ImpactMetric],
        critical_kpi_failed: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates aggregate weighted impact score and algorithmic outcome recommendation:
        - >= 80.0 -> SUCCESSFUL
        - 50.0 - 79.99 -> PARTIALLY_SUCCESSFUL
        - < 50.0 -> UNSUCCESSFUL
        - Critical KPI Gate: If a critical KPI fails, overall recommendation is blocked from SUCCESSFUL.
        """
        if not metrics:
            return {
                "impact_score": 0.0,
                "recommended_outcome": ScaleOutcomeType.INCONCLUSIVE.value,
                "metric_evaluations": [],
                "has_critical_failure": False,
            }

        total_weight = 0.0
        weighted_score_sum = 0.0
        metric_evals = []
        has_critical_failure = critical_kpi_failed

        for m in metrics:
            score = cls.normalize_impact_metric_score(
                actual=m.actual_value,
                target=m.target_value,
                baseline=m.baseline_value,
                direction=m.direction,
            )
            weight = m.weight if (m.weight and m.weight > 0) else 1.0
            total_weight += weight
            weighted_score_sum += score * weight

            is_failed = score < 50.0
            if getattr(m, "is_critical", False) and is_failed:
                has_critical_failure = True

            metric_evals.append({
                "metric_id": getattr(m, "id", "metric-id"),
                "code": getattr(m, "code", "METRIC"),
                "title": getattr(m, "title", "Impact Metric"),
                "category": getattr(m, "category", "SERVICE_DELIVERY"),
                "score": score,
                "weight": weight,
                "is_critical": getattr(m, "is_critical", False),
                "is_met": score >= 80.0,
            })

        overall_score = weighted_score_sum / total_weight if total_weight > 0 else 0.0
        overall_score = max(0.0, min(100.0, round(float(overall_score), 2)))

        # Recommendation logic
        if overall_score >= 80.0:
            if has_critical_failure:
                recommended = ScaleOutcomeType.PARTIALLY_SUCCESSFUL.value
            else:
                recommended = ScaleOutcomeType.SUCCESSFUL.value
        elif overall_score >= 50.0:
            recommended = ScaleOutcomeType.PARTIALLY_SUCCESSFUL.value
        else:
            recommended = ScaleOutcomeType.UNSUCCESSFUL.value

        return {
            "impact_score": overall_score,
            "recommended_outcome": recommended,
            "metric_evaluations": metric_evals,
            "has_critical_failure": has_critical_failure,
            "critical_kpis_passed": not has_critical_failure,
        }

    @staticmethod
    def validate_scale_budget(
        plan_budget: float,
        target_budgets: List[float],
        phase_budgets: List[float],
    ) -> Dict[str, Any]:
        """
        Validates economic constraints:
        - Budgets cannot be negative.
        - Sum of phase budgets cannot exceed approved scale budget.
        """
        pb_val = float(plan_budget or 0)
        tb_vals = [float(tb or 0) for tb in target_budgets]
        phase_vals = [float(pb or 0) for pb in phase_budgets]

        if pb_val < 0:
            return {"is_valid": False, "error": "Scale plan budget cannot be negative."}

        for tb in tb_vals:
            if tb < 0:
                return {"is_valid": False, "error": "Target budget cannot be negative."}

        for pb in phase_vals:
            if pb < 0:
                return {"is_valid": False, "error": "Phase budget cannot be negative."}

        total_phase_budget = sum(phase_vals)
        if total_phase_budget > pb_val + 1e-4:
            return {
                "is_valid": False,
                "error": f"Sum of phase budgets (₹{total_phase_budget:,.2f}) cannot exceed approved scale budget (₹{pb_val:,.2f}).",
            }

        return {"is_valid": True, "error": None}

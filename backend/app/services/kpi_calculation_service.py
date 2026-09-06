import math
from typing import List, Optional, Dict, Any
from app.models.pilot_kpi import KPIDirection, TargetOperator
from app.models.validation_workflow import ValidationAssessment, KPIValidationResult


class KPICalculationService:
    @staticmethod
    def is_target_met(actual: float, target: float, operator: str) -> bool:
        """Determines if actual measured value satisfies target based on operator."""
        if actual is None or target is None:
            return False
        
        op = str(operator).upper()
        if op == TargetOperator.GREATER_THAN.value or op == "GREATER_THAN":
            return actual > target
        elif op == TargetOperator.GREATER_THAN_OR_EQUAL.value or op == "GREATER_THAN_OR_EQUAL":
            return actual >= target
        elif op == TargetOperator.LESS_THAN.value or op == "LESS_THAN":
            return actual < target
        elif op == TargetOperator.LESS_THAN_OR_EQUAL.value or op == "LESS_THAN_OR_EQUAL":
            return actual <= target
        elif op == TargetOperator.EQUAL.value or op == "EQUAL":
            return math.isclose(actual, target, abs_tol=1e-5)
        return False

    @staticmethod
    def calculate_achievement_percentage(
        actual: Optional[float],
        target: float,
        baseline: Optional[float] = None,
        direction: str = "HIGHER_IS_BETTER"
    ) -> float:
        """
        Calculates percentage of KPI achievement cleanly and deterministically.
        Normalized between 0.0 and 150.0%.
        """
        if actual is None or target is None:
            return 0.0

        dir_str = str(direction).upper()

        if dir_str == KPIDirection.HIGHER_IS_BETTER.value or dir_str == "HIGHER_IS_BETTER":
            if baseline is not None and baseline != target:
                delta_target = target - baseline
                delta_actual = actual - baseline
                if delta_target > 0:
                    pct = (delta_actual / delta_target) * 100.0
                else:
                    pct = (actual / target) * 100.0 if target > 0 else 0.0
            else:
                pct = (actual / target) * 100.0 if target > 0 else (100.0 if actual >= target else 0.0)

        elif dir_str == KPIDirection.LOWER_IS_BETTER.value or dir_str == "LOWER_IS_BETTER":
            # Baseline is higher than target; lower actual is better
            if baseline is not None and baseline != target:
                delta_target = baseline - target
                delta_actual = baseline - actual
                if delta_target > 0:
                    pct = (delta_actual / delta_target) * 100.0
                else:
                    pct = (target / actual) * 100.0 if actual > 0 else 100.0
            else:
                pct = (target / actual) * 100.0 if actual > 0 else (100.0 if actual <= target else 0.0)

        elif dir_str == KPIDirection.TARGET_VALUE.value or dir_str == "TARGET_VALUE":
            if target != 0:
                diff = abs(actual - target)
                pct = max(0.0, (1.0 - (diff / abs(target))) * 100.0)
            else:
                pct = 100.0 if math.isclose(actual, target, abs_tol=1e-5) else 0.0
        else:
            pct = (actual / target) * 100.0 if target > 0 else 0.0

        return max(0.0, min(150.0, round(float(pct), 2)))

    @classmethod
    def evaluate_kpi(
        cls,
        actual: Optional[float],
        target: float,
        baseline: Optional[float] = None,
        direction: str = "HIGHER_IS_BETTER",
        operator: str = "GREATER_THAN_OR_EQUAL"
    ) -> Dict[str, Any]:
        """Evaluates single KPI metrics."""
        if actual is None:
            return {
                "achievement_percentage": 0.0,
                "is_met": False,
                "result": KPIValidationResult.INCONCLUSIVE.value
            }

        achievement = cls.calculate_achievement_percentage(actual, target, baseline, direction)
        is_met = cls.is_target_met(actual, target, operator)
        result = KPIValidationResult.ACHIEVED.value if (is_met or achievement >= 100.0) else KPIValidationResult.NOT_ACHIEVED.value

        return {
            "achievement_percentage": achievement,
            "is_met": is_met,
            "result": result
        }

    @classmethod
    def calculate_overall_assessment(
        cls,
        kpi_evaluations: List[Dict[str, Any]],
        evidence_sufficient: bool = True
    ) -> Dict[str, Any]:
        """
        Computes weighted overall achievement and pilot success classification recommendation.
        Rule:
        - >= 80% -> SUCCESSFUL
        - 50% - 79.99% -> PARTIALLY_SUCCESSFUL
        - < 50% -> UNSUCCESSFUL
        - Insufficient evidence -> INCONCLUSIVE
        """
        if not kpi_evaluations or not evidence_sufficient:
            return {
                "overall_assessment": ValidationAssessment.INCONCLUSIVE.value,
                "overall_achievement_percentage": 0.0,
                "kpis_achieved_count": 0,
                "kpis_total_count": len(kpi_evaluations)
            }

        total_weight = 0.0
        weighted_sum = 0.0
        achieved_count = 0

        for item in kpi_evaluations:
            weight = float(item.get("weight", 1.0))
            achievement = float(item.get("achievement_percentage", 0.0))
            is_met = item.get("is_met", False) or item.get("result") == KPIValidationResult.ACHIEVED.value

            total_weight += weight
            weighted_sum += (achievement * weight)
            if is_met:
                achieved_count += 1

        overall_pct = round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0

        if overall_pct >= 80.0:
            assessment = ValidationAssessment.SUCCESSFUL.value
        elif overall_pct >= 50.0:
            assessment = ValidationAssessment.PARTIALLY_SUCCESSFUL.value
        else:
            assessment = ValidationAssessment.UNSUCCESSFUL.value

        return {
            "overall_assessment": assessment,
            "overall_achievement_percentage": overall_pct,
            "kpis_achieved_count": achieved_count,
            "kpis_total_count": len(kpi_evaluations)
        }

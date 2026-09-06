from typing import List, Dict, Any, Optional
from app.models.evaluation_criteria import EvaluationCriteria
from app.models.evaluation import Evaluation


class ScoringService:
    """
    Transparent mathematical scoring engine.
    Calculates weighted criterion scores and multi-expert aggregations.
    Never trusts client calculations; all final scores computed server-side.
    """

    @staticmethod
    def calculate_criterion_scores(
        criterion: EvaluationCriteria,
        raw_score: float,
    ) -> Dict[str, float]:
        """
        Computes normalized score and weighted score for a single criterion.
        normalized = raw_score / max_score
        weighted = normalized * weight
        """
        max_score = float(criterion.max_score) if criterion.max_score else 10.0
        weight = float(criterion.weight)

        # Boundary clamping for safety
        clamped_score = max(0.0, min(float(raw_score), max_score))
        normalized_score = round(clamped_score / max_score, 4) if max_score > 0 else 0.0
        weighted_score = round(normalized_score * weight, 4)

        return {
            "score": round(clamped_score, 2),
            "normalized_score": normalized_score,
            "weighted_score": weighted_score,
        }

    @classmethod
    def calculate_overall_score(
        cls,
        criteria_list: List[EvaluationCriteria],
        scores_map: Dict[str, float],
    ) -> float:
        """
        Computes the total overall score (0.00 - 100.00) from criteria scores.
        overall_score = SUM( (score / max_score) * weight )
        """
        total_weighted = 0.0
        for criterion in criteria_list:
            if criterion.id in scores_map:
                res = cls.calculate_criterion_scores(criterion, scores_map[criterion.id])
                total_weighted += res["weighted_score"]

        return round(total_weighted, 2)

    @classmethod
    def calculate_evaluation_overall_score(
        cls,
        scores: List[Dict[str, Any]],
    ) -> float:
        """
        Computes the total overall score (0.00 - 100.00) from list of criterion score dicts:
        [{criterion_id, score, max_score, weight}, ...]
        """
        total = 0.0
        for s in scores:
            max_s = float(s.get("max_score", 10.0))
            w = float(s.get("weight", 0.0))
            raw = float(s.get("score", 0.0))
            clamped = max(0.0, min(raw, max_s))
            norm = clamped / max_s if max_s > 0 else 0.0
            total += norm * w
        return round(min(100.0, max(0.0, total)), 2)

    @classmethod
    def aggregate_multi_expert_scores(
        cls,
        overall_scores: List[float],
    ) -> Dict[str, Any]:
        """
        Aggregates multiple expert overall scores into average, max, and min.
        """
        if not overall_scores:
            return {
                "evaluations_count": 0,
                "average_score": 0.0,
                "highest_score": 0.0,
                "lowest_score": 0.0,
            }
        return {
            "evaluations_count": len(overall_scores),
            "average_score": round(sum(overall_scores) / len(overall_scores), 2),
            "highest_score": round(max(overall_scores), 2),
            "lowest_score": round(min(overall_scores), 2),
        }

    @classmethod
    def aggregate_application_evaluations(
        cls,
        evaluations: List[Evaluation],
        criteria: List[EvaluationCriteria],
    ) -> Dict[str, Any]:
        """
        Aggregates multiple submitted expert evaluations for an application.
        Returns:
            - average_score
            - highest_score
            - lowest_score
            - completed_evaluations_count
            - recommendations_summary
            - criteria_breakdown
        """
        submitted = [e for e in evaluations if e.is_submitted and e.overall_score is not None]

        rec_counts: Dict[str, int] = {
            "STRONGLY_RECOMMEND": 0,
            "RECOMMEND": 0,
            "NEUTRAL": 0,
            "DO_NOT_RECOMMEND": 0,
        }

        for ev in submitted:
            rec_str = str(ev.recommendation.value if hasattr(ev.recommendation, "value") else ev.recommendation)
            if rec_str in rec_counts:
                rec_counts[rec_str] += 1
            elif rec_str:
                rec_counts[rec_str] = rec_counts.get(rec_str, 0) + 1

        if not submitted:
            return {
                "average_score": None,
                "highest_score": None,
                "lowest_score": None,
                "completed_evaluations_count": 0,
                "recommendations_summary": rec_counts,
                "criteria_breakdown": [],
            }

        scores = [float(e.overall_score) for e in submitted]
        avg_score = round(sum(scores) / len(scores), 2)
        highest_score = round(max(scores), 2)
        lowest_score = round(min(scores), 2)

        # Calculate criteria level breakdown across all submitted evaluations
        criteria_breakdown = []
        for crit in criteria:
            crit_scores = []
            for ev in submitted:
                for score_entry in ev.scores:
                    if score_entry.criterion_id == crit.id:
                        crit_scores.append(float(score_entry.score))
                        break

            avg_crit_score = round(sum(crit_scores) / len(crit_scores), 2) if crit_scores else 0.0
            calc = cls.calculate_criterion_scores(crit, avg_crit_score)

            criteria_breakdown.append({
                "criterion_id": crit.id,
                "criterion_name": crit.name,
                "weight": float(crit.weight),
                "max_score": float(crit.max_score),
                "average_score": avg_crit_score,
                "average_weighted_score": round(calc["weighted_score"], 2),
                "evaluations_count": len(crit_scores),
            })

        return {
            "average_score": avg_score,
            "highest_score": highest_score,
            "lowest_score": lowest_score,
            "completed_evaluations_count": len(submitted),
            "recommendations_summary": rec_counts,
            "criteria_breakdown": criteria_breakdown,
        }

import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session

from app.models.ai_assessment import AIAssessment, AIAssessmentStatus, AIRecommendation
from app.models.application import Application
from app.models.challenge import Challenge
from app.schemas.ai_assessment import AIAssessmentResponse, AIFactorScore

logger = logging.getLogger("govinnovate.ai_shortlisting")


class AIShortlistingService:
    """
    Explainable AI-assisted shortlisting service for government challenges.
    Provides an assistive recommendation and risk-assessment layer.
    Ensures that human expert evaluation and government nodal officer decisions remain paramount.
    """

    MODEL_VERSION = "rule-based-nlp-v1.0"
    EXECUTION_MODE = "DEMO_RULE_BASED"
    MODE_LABEL = "AI-Assisted Assessment — Demo/Rule-Based Mode"

    @classmethod
    def get_or_create_assessment(
        cls, db: Session, application_id: str, force_reanalyze: bool = False
    ) -> AIAssessmentResponse:
        """
        Retrieves existing assessment or evaluates the application deterministically.
        """
        existing = db.query(AIAssessment).filter(AIAssessment.application_id == application_id).first()
        if existing and not force_reanalyze:
            return cls._build_response(existing)

        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise ValueError(f"Application {application_id} not found.")

        challenge = application.challenge
        if not challenge:
            raise ValueError(f"Challenge associated with application {application_id} not found.")

        assessment_record = cls.analyze_application(db, application, challenge)
        return cls._build_response(assessment_record)

    @classmethod
    def analyze_application(
        cls, db: Session, application: Application, challenge: Challenge
    ) -> AIAssessment:
        """
        Evaluates the startup proposal against challenge specifications.
        Returns a persisted AIAssessment record.
        """
        existing = db.query(AIAssessment).filter(AIAssessment.application_id == application.id).first()
        if not existing:
            existing = AIAssessment(
                application_id=application.id,
                challenge_id=challenge.id,
                model_version=cls.MODEL_VERSION,
                execution_mode=cls.EXECUTION_MODE,
                mode_label=cls.MODE_LABEL,
            )
            db.add(existing)

        # 1. Check for Insufficient Data
        is_sufficient, insufficiency_reason = cls._check_data_sufficiency(application)
        if not is_sufficient:
            existing.status = AIAssessmentStatus.INSUFFICIENT_DATA.value
            existing.overall_score = None
            existing.problem_solution_fit_score = None
            existing.technical_readiness_score = None
            existing.kpi_alignment_score = None
            existing.pilot_feasibility_score = None
            existing.relevant_experience_score = None
            existing.risk_completeness_score = None
            existing.recommendation = AIRecommendation.INSUFFICIENT_DATA.value
            existing.recommendation_label = "Insufficient Data"
            existing.positive_reasons = json.dumps([])
            existing.risk_flags = json.dumps([insufficiency_reason])
            existing.summary = "AI assessment unavailable — additional application information is required."
            existing.analyzed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            return existing

        # 2. Factor 1: Problem–Solution Fit (30% weight, max 30)
        fit_score, fit_reasons, fit_concerns = cls._evaluate_problem_solution_fit(application, challenge)

        # 3. Factor 2: Technical Readiness / TRL (20% weight, max 20)
        tech_score, tech_reasons, tech_concerns = cls._evaluate_technical_readiness(application, challenge)

        # 4. Factor 3: KPI / Outcome Alignment (20% weight, max 20)
        kpi_score, kpi_reasons, kpi_concerns = cls._evaluate_kpi_alignment(application, challenge)

        # 5. Factor 4: Pilot Feasibility & Timeline (15% weight, max 15)
        feasibility_score, feas_reasons, feas_concerns = cls._evaluate_pilot_feasibility(application, challenge)

        # 6. Factor 5: Relevant Experience & Team Capability (10% weight, max 10)
        exp_score, exp_reasons, exp_concerns = cls._evaluate_relevant_experience(application, challenge)

        # 7. Factor 6: Risk & Application Completeness (5% weight, max 5)
        risk_score, risk_reasons, risk_concerns = cls._evaluate_risk_completeness(application, challenge)

        # Overall Composite AI Match Score (0 - 100)
        total_score = round(
            fit_score + tech_score + kpi_score + feasibility_score + exp_score + risk_score,
            1,
        )
        total_score = max(0.0, min(100.0, total_score))

        # Qualitative Recommendation
        if total_score >= 80.0:
            recommendation = AIRecommendation.STRONG_MATCH.value
            recommendation_label = "Strong Match"
        elif total_score >= 60.0:
            recommendation = AIRecommendation.MODERATE_MATCH.value
            recommendation_label = "Moderate Match"
        else:
            recommendation = AIRecommendation.LOW_MATCH.value
            recommendation_label = "Low Match"

        # Deduplicate and compile explainability bullet points
        all_positive = fit_reasons + tech_reasons + kpi_reasons + feas_reasons + exp_reasons + risk_reasons
        all_concerns = fit_concerns + tech_concerns + kpi_concerns + feas_concerns + exp_concerns + risk_concerns

        # Keep top 4-6 positive reasons and 1-3 concerns
        selected_positives = [p for p in all_positive if p][:5]
        selected_concerns = [c for c in all_concerns if c][:3]
        if not selected_concerns:
            selected_concerns = ["Standard empirical verification and STQC/audit certificates recommended prior to commercial scale-up."]

        summary_text = (
            f"Automated AI match assessment calculated an assistive score of {total_score:.1f}/100 "
            f"({recommendation_label}) based on challenge requirement alignment, technical feasibility, "
            f"and proposed pilot sandbox parameters."
        )

        existing.status = AIAssessmentStatus.COMPLETED.value
        existing.overall_score = total_score
        existing.problem_solution_fit_score = round(fit_score, 1)
        existing.technical_readiness_score = round(tech_score, 1)
        existing.kpi_alignment_score = round(kpi_score, 1)
        existing.pilot_feasibility_score = round(feasibility_score, 1)
        existing.relevant_experience_score = round(exp_score, 1)
        existing.risk_completeness_score = round(risk_score, 1)
        existing.recommendation = recommendation
        existing.recommendation_label = recommendation_label
        existing.positive_reasons = json.dumps(selected_positives)
        existing.risk_flags = json.dumps(selected_concerns)
        existing.summary = summary_text
        existing.analyzed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(existing)
        return existing

    # =========================================================================
    # Evaluation Factors
    # =========================================================================

    @classmethod
    def _check_data_sufficiency(cls, app: Application) -> Tuple[bool, str]:
        """
        Verifies minimum data presence to prevent fabricated scoring on empty forms.
        """
        exec_summary = (app.executive_summary or app.proposal_summary or "").strip()
        prop_solution = (app.proposed_solution or "").strip()
        tech_approach = (app.technical_approach or "").strip()

        if len(exec_summary) < 20 and len(prop_solution) < 20 and len(tech_approach) < 20:
            return False, "Application is missing core technical descriptions and solution details required for AI evaluation."

        return True, ""

    @classmethod
    def _evaluate_problem_solution_fit(
        cls, app: Application, challenge: Challenge
    ) -> Tuple[float, List[str], List[str]]:
        """
        Factor 1: Problem–Solution Fit (Max 30 pts)
        Evaluates conceptual overlap between challenge problem/outcome and startup proposal.
        """
        positives = []
        concerns = []

        challenge_text = f"{challenge.problem_statement or ''} {challenge.desired_outcome or ''} {challenge.domain or ''}".lower()
        solution_text = f"{app.problem_understanding or ''} {app.executive_summary or ''} {app.proposed_solution or ''} {app.proposal_title or ''}".lower()

        challenge_words = set(cls._extract_keywords(challenge_text))
        solution_words = set(cls._extract_keywords(solution_text))

        overlap = challenge_words.intersection(solution_words)
        overlap_ratio = len(overlap) / max(1, min(len(challenge_words), 25))

        # Base score scaled 15 to 28 based on semantic keyword overlap
        base_score = 15.0 + (overlap_ratio * 13.0)

        # Domain alignment check
        if challenge.domain and challenge.domain.lower() in solution_text:
            base_score += 2.0
            positives.append(f"Direct sector alignment with {challenge.domain} requirements.")

        score = min(30.0, max(12.0, base_score))

        if len(overlap) >= 5:
            matched_terms = list(overlap)[:3]
            positives.append(f"Solution directly targets core problem dimensions: {', '.join(matched_terms)}.")
        else:
            concerns.append("Problem diagnosis could be more specifically tailored to department operational bottlenecks.")

        if app.problem_understanding and len(app.problem_understanding.strip()) > 80:
            positives.append("Demonstrates clear contextual diagnosis of current public sector limitations.")

        return score, positives, concerns

    @classmethod
    def _evaluate_technical_readiness(
        cls, app: Application, challenge: Challenge
    ) -> Tuple[float, List[str], List[str]]:
        """
        Factor 2: Technical Readiness / TRL (Max 20 pts)
        Evaluates declared TRL and architecture depth.
        """
        positives = []
        concerns = []

        # TRL parsing
        trl_str = (app.proposed_solution_trl or "TRL 7").upper()
        trl_match = re.search(r"TRL\s*(\d)", trl_str)
        trl_num = int(trl_match.group(1)) if trl_match else 7

        trl_scores = {
            9: 19.5,
            8: 18.5,
            7: 17.0,
            6: 15.0,
            5: 12.0,
        }
        score = trl_scores.get(trl_num, 14.0)

        tech_text = f"{app.technical_approach or ''} {app.proposed_solution or ''}".lower()

        # Architecture keywords check
        arch_keywords = ["architecture", "telemetry", "api", "edge", "cloud", "offline", "latency", "sensor", "model", "pipeline", "security"]
        detected = [k for k in arch_keywords if k in tech_text]

        if len(detected) >= 3:
            score = min(20.0, score + 1.5)
            positives.append(f"Technical architecture details concrete stack components (TRL {trl_num} validated).")
        else:
            concerns.append("Technical architecture would benefit from more granular hardware/software interface specifications.")

        if "edge" in tech_text or "offline" in tech_text or "real-time" in tech_text:
            positives.append("Includes edge/offline telemetry or real-time operational processing fallback.")

        return min(20.0, score), positives, concerns

    @classmethod
    def _evaluate_kpi_alignment(
        cls, app: Application, challenge: Challenge
    ) -> Tuple[float, List[str], List[str]]:
        """
        Factor 3: KPI / Outcome Alignment (Max 20 pts)
        Measures congruence between challenge outcomes/KPIs and startup commitments.
        """
        positives = []
        concerns = []

        outcomes_text = (app.expected_outcomes or "").lower()
        score = 14.0

        if challenge.kpis:
            kpi_names = [k.name.lower() for k in challenge.kpis if k.name]
            matched_kpis = [k for k in kpi_names if any(w in outcomes_text for w in k.split() if len(w) > 3)]
            if matched_kpis:
                score += min(5.0, len(matched_kpis) * 2.0)
                positives.append(f"Target outcomes commit to quantitative benchmarks mirroring challenge KPIs.")
            else:
                score += 1.0
                concerns.append("Outcomes describe general impact; explicit correlation to challenge KPI targets suggested.")
        elif challenge.desired_outcome:
            desired_lower = challenge.desired_outcome.lower()
            overlap = [w for w in cls._extract_keywords(desired_lower) if w in outcomes_text]
            if len(overlap) >= 3:
                score += 4.0
                positives.append("Proposed outcomes explicitly align with desired departmental public impact.")
            else:
                score += 2.0

        if any(char.isdigit() for char in outcomes_text) and ("%" in outcomes_text or "reduction" in outcomes_text or "increase" in outcomes_text):
            score += 1.0
            positives.append("Specifies quantifiable improvement metrics rather than generic claims.")

        return min(20.0, score), positives, concerns

    @classmethod
    def _evaluate_pilot_feasibility(
        cls, app: Application, challenge: Challenge
    ) -> Tuple[float, List[str], List[str]]:
        """
        Factor 4: Pilot Feasibility & Timeline (Max 15 pts)
        Evaluates 90-day sandbox viability and implementation milestones.
        """
        positives = []
        concerns = []

        score = 10.0
        pilot_text = f"{app.pilot_plan or ''} {app.implementation_plan or ''}".lower()

        # Timeline validation
        app_days = app.timeline_days or 90
        chal_days = challenge.pilot_duration_days or 90

        if app_days <= chal_days:
            score += 2.5
            positives.append(f"Pilot implementation timeline ({app_days} days) matches challenge parameters.")
        else:
            concerns.append(f"Proposed timeline ({app_days} days) exceeds preferred challenge duration ({chal_days} days).")

        # Milestone structure check
        if any(term in pilot_text for term in ["milestone", "phase", "day 30", "day 60", "day 90", "week"]):
            score += 2.0
            positives.append("Sandbox plan is structured into defined, verifiable milestones.")
        else:
            concerns.append("Implementation roadmap would benefit from more granular phased deliverables.")

        # Testbed / site specificity
        if any(term in pilot_text for term in ["site", "location", "facility", "district", "hospital", "phc", "feeder", "junction", "ward"]):
            score += 0.5
            positives.append("Identifies clear deployment environment and field sandbox constraints.")

        return min(15.0, score), positives, concerns

    @classmethod
    def _evaluate_relevant_experience(
        cls, app: Application, challenge: Challenge
    ) -> Tuple[float, List[str], List[str]]:
        """
        Factor 5: Relevant Experience & Team Capability (Max 10 pts)
        Evaluates previous deployments and technical credentials.
        """
        positives = []
        concerns = []

        score = 6.0
        exp_text = f"{app.team_capabilities or ''} {app.previous_deployments or ''}".lower()

        if app.previous_deployments and len(app.previous_deployments.strip()) > 30:
            score += 2.5
            positives.append("Demonstrated engineering capability and relevant deployment track record.")
        else:
            concerns.append("Limited documentation of prior field pilots or public sector deployments.")

        if any(gov_term in exp_text for gov_term in ["government", "municipal", "smart city", "mou", "nic", "tender", "gem", "iit", "public"]):
            score += 1.5
            positives.append("Previous experience with government, municipal, or research institute collaborations.")
        else:
            concerns.append("First-time public sector deployment; recommend closer nodal officer guidance during setup.")

        return min(10.0, score), positives, concerns

    @classmethod
    def _evaluate_risk_completeness(
        cls, app: Application, challenge: Challenge
    ) -> Tuple[float, List[str], List[str]]:
        """
        Factor 6: Risk & Application Completeness (Max 5 pts)
        Evaluates completeness of statutory sections, dependencies, and attached documents.
        """
        positives = []
        concerns = []

        score = 3.0

        # Risk articulation
        if app.risks and len(app.risks.strip()) > 20:
            score += 1.0
            positives.append("Proactively identifies operational risks and mitigation safeguards.")

        # Supporting documents
        docs = []
        if app.supporting_documents:
            try:
                docs = json.loads(app.supporting_documents) if isinstance(app.supporting_documents, str) else app.supporting_documents
            except Exception:
                docs = []

        if len(docs) > 0:
            score += 1.0
            positives.append(f"Accompanied by {len(docs)} supporting architectural whitepapers/credentials.")

        return min(5.0, score), positives, concerns

    # =========================================================================
    # Helpers
    # =========================================================================

    @classmethod
    def _extract_keywords(cls, text: str) -> List[str]:
        """Simple English tokenizer filtering common stop words."""
        stopwords = {
            "the", "and", "for", "with", "that", "this", "from", "are", "have", "has",
            "been", "will", "our", "all", "any", "must", "can", "into", "over", "such",
            "current", "system", "technology", "solution", "approach", "project", "work",
            "more", "some", "what", "which", "when", "where", "about", "other", "using",
        }
        tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        return [t for t in tokens if t not in stopwords]

    @classmethod
    def _build_response(cls, record: AIAssessment) -> AIAssessmentResponse:
        """Converts database record to Pydantic response schema."""
        positive_reasons = []
        risk_flags = []
        if record.positive_reasons:
            try:
                positive_reasons = json.loads(record.positive_reasons)
            except Exception:
                positive_reasons = [record.positive_reasons]
        if record.risk_flags:
            try:
                risk_flags = json.loads(record.risk_flags)
            except Exception:
                risk_flags = [record.risk_flags]

        factors = [
            AIFactorScore(
                factor_key="problem_solution_fit",
                label="Problem–Solution Fit",
                score=record.problem_solution_fit_score,
                max_score=30.0,
                weight_percentage=30.0,
                description="Challenge problem diagnosis, root-cause fit, and sector relevance",
            ),
            AIFactorScore(
                factor_key="technical_readiness",
                label="Technical Readiness / TRL",
                score=record.technical_readiness_score,
                max_score=20.0,
                weight_percentage=20.0,
                description="Validated TRL maturity and system architecture specification",
            ),
            AIFactorScore(
                factor_key="kpi_alignment",
                label="KPI / Outcome Alignment",
                score=record.kpi_alignment_score,
                max_score=20.0,
                weight_percentage=20.0,
                description="Quantitative benchmark commitment and public impact alignment",
            ),
            AIFactorScore(
                factor_key="pilot_feasibility",
                label="Pilot Feasibility & Timeline",
                score=record.pilot_feasibility_score,
                max_score=15.0,
                weight_percentage=15.0,
                description="Sandbox timeline feasibility and phased deliverable milestones",
            ),
            AIFactorScore(
                factor_key="relevant_experience",
                label="Relevant Experience",
                score=record.relevant_experience_score,
                max_score=10.0,
                weight_percentage=10.0,
                description="Team capabilities and past field/enterprise deployment track record",
            ),
            AIFactorScore(
                factor_key="risk_completeness",
                label="Risk & Application Completeness",
                score=record.risk_completeness_score,
                max_score=5.0,
                weight_percentage=5.0,
                description="Operational risk mitigation and completeness of attachments",
            ),
        ]

        return AIAssessmentResponse(
            id=record.id,
            application_id=record.application_id,
            challenge_id=record.challenge_id,
            status=record.status,
            overall_score=record.overall_score,
            score_label="AI-Assisted Match Score",
            recommendation=record.recommendation,
            recommendation_label=record.recommendation_label,
            factors=factors,
            positive_reasons=positive_reasons,
            risk_flags=risk_flags,
            summary=record.summary,
            model_version=record.model_version,
            execution_mode=record.execution_mode,
            mode_label=record.mode_label,
            analyzed_at=record.analyzed_at,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

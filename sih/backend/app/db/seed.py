"""
GovInnovate Development Database Seeder

Provisions standardized development personas for all 6 stakeholder roles.
DEVELOPMENT USE ONLY - DO NOT USE IN PRODUCTION ENVIRONMENTS.

Credentials Summary:
  - GOVERNMENT:          government@govinnovate.gov.in  / GovDev123!
  - STARTUP:             startup@innovatetech.io         / StartupDev123!
  - EXPERT:              expert@iitd.ac.in              / ExpertDev123!
  - VALIDATOR:           validator@stqc.gov.in          / ValidatorDev123!
  - PROCUREMENT_OFFICER: procurement@gem.gov.in         / ProcureDev123!
  - ADMIN:               admin@govinnovate.gov.in       / AdminDev123!

Usage:
  python -m app.db.seed
"""

import sys
import json
import logging
from datetime import datetime, timezone, date
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
import app.models  # Load models
from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.challenge import Challenge
from app.models.application import Application
from app.models.audit_log import AuditLog
from app.models.evaluation_criteria import EvaluationCriteria
from app.models.expert_profile import ExpertProfile
from app.models.evaluation_assignment import EvaluationAssignment, AssignmentStatus
from app.models.conflict_of_interest import ConflictOfInterest, ConflictDeclaration
from app.models.evaluation import Evaluation, EvaluationRecommendation
from app.models.evaluation_score import EvaluationScore
from app.models.pilot import Pilot, PilotStatus, PilotApprovalStatus, PilotSuccessStatus
from app.models.milestone import Milestone, MilestoneStatus, MilestoneAcceptanceStatus
from app.models.pilot_deliverable import PilotDeliverable, DeliverableStatus
from app.models.pilot_kpi import (
    PilotKPI,
    KPICategory,
    KPIMeasurementType,
    KPIDirection,
    TargetOperator,
    KPIStatus,
    KPIMeasurement,
    MeasurementStatus,
    KPIEvidence,
    EvidenceType,
    EvidenceStatus,
)
from app.models.validation_workflow import (
    ValidatorProfile,
    ValidatorAvailability,
    ValidationAssignment,
    ValidatorConflictOfInterest,
    ValidatorCOIDeclaration,
    ValidationReport,
    ValidationAssessment,
    ValidationConfidence,
    KPIValidation,
    KPIValidationResult,
    PilotValidationStatus,
)
from app.models.procurement import (
    ProcurementPathway,
    ProcurementPathwayType,
    ProcurementDecision,
    ProcurementDecisionType,
    PilotValidationAssessment,
    ProcurementRecord,
    ProcurementStatus,
    ProcurementApproval,
    ApprovalStatus,
    Contract,
    ContractStatus,
    ContractMilestone,
    ContractMilestoneStatus,
    PaymentTranche,
    TrancheStatus,
    Invoice,
    InvoiceStatus,
    ProcurementDocument,
)
from app.models.scale_up import (
    ScaleUpDecision,
    ScaleUpPlan,
    ScaleTarget,
    ScalePhase,
    ScaleReadinessCheck,
    Replication,
    ScaleDeploymentUpdate,
    ImpactMetric,
    ImpactMeasurement,
    ImpactEvidence,
    ScaleOutcome,
    ScaleBeneficiaryMetric,
    ScaleRisk,
    ScaleLesson,
    ScaleUpDecisionType,
    ScaleUpDecisionStatus,
    ScalePlanStatus,
    ScalePlanApprovalStatus,
    RolloutStrategy,
    ScaleTargetType,
    ScaleTargetStatus,
    ReplicationDeploymentStatus,
    ReadinessCategory,
    ReadinessStatus,
    ScalePhaseStatus,
    ImpactCategory,
    ImpactDirection,
    ScaleOutcomeType,
    BeneficiaryCategory,
    RiskCategory,
    RiskSeverity,
    RiskStatus,
    LessonCategory,
)
from app.core.security import UserRole, hash_password

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("govinnovate.seed")


SEED_PERSONAS = [
    {
        "role": UserRole.GOVERNMENT,
        "email": "government@govinnovate.gov.in",
        "password": "GovInnovate2025!",
        "full_name": "Dr. Rajesh Kumar",
        "organization_name": "Ministry of Electronics and Information Technology",
        "designation": "Joint Director & Nodal Officer",
        "phone_number": "+91-11-2436-0101",
        "domain_expertise": "Public Digital Infrastructure, Governance",
        "dept_name": "Ministry of Electronics and IT",
        "dept_code": "MEITY-01",
        "ministry": "Ministry of Electronics and Information Technology",
    },
    {
        "role": UserRole.STARTUP,
        "email": "startup@govinnovate.dev",
        "password": "GovInnovate2025!",
        "full_name": "Ananya Sharma",
        "organization_name": "InnovateTech AI Solutions Pvt Ltd",
        "designation": "Founder & CEO",
        "phone_number": "+91-98100-22334",
        "domain_expertise": "CivicTech, Computer Vision & Edge AI",
        "company_name": "InnovateTech AI Solutions Pvt Ltd",
        "dpiit_number": "DPIIT-89210",
        "sector": "CivicTech & Smart Cities",
    },
    {
        "role": UserRole.STARTUP,
        "email": "startup@innovatetech.io",
        "password": "GovInnovate2025!",
        "full_name": "Ananya Sharma",
        "organization_name": "InnovateTech AI Solutions Pvt Ltd",
        "designation": "Founder & CEO",
        "phone_number": "+91-98100-22334",
        "domain_expertise": "CivicTech, Computer Vision & Edge AI",
        "company_name": "InnovateTech AI Solutions Pvt Ltd",
        "dpiit_number": "DPIIT-89210",
        "sector": "CivicTech & Smart Cities",
    },
    {
        "role": UserRole.EXPERT,
        "email": "expert@govinnovate.gov.in",
        "password": "GovInnovate2025!",
        "full_name": "Prof. Vikram Sen",
        "organization_name": "Indian Institute of Technology Delhi",
        "designation": "Professor & Technical Evaluator",
        "phone_number": "+91-11-2659-7100",
        "domain_expertise": "Autonomous Systems, IoT Telemetry, AI Safety",
    },
    {
        "role": UserRole.VALIDATOR,
        "email": "validator@govinnovate.org",
        "password": "GovInnovate2025!",
        "full_name": "Dr. Sunita Patel",
        "organization_name": "Standardisation Testing and Quality Certification Directorate",
        "designation": "Principal Testing Scientist",
        "phone_number": "+91-11-2436-5432",
        "domain_expertise": "GFR 2017 Compliance, Software Quality & Security Audits",
    },
    {
        "role": UserRole.VALIDATOR,
        "email": "validator2@govinnovate.org",
        "password": "GovInnovate2025!",
        "full_name": "Er. Arvind Narayanan",
        "organization_name": "National Physical Laboratory & Metrology Standards",
        "designation": "Chief Validation Assessor",
        "phone_number": "+91-11-4567-8901",
        "domain_expertise": "Sensor Calibration, Field IoT Telemetry, Systems Verification",
    },
    {
        "role": UserRole.PROCUREMENT_OFFICER,
        "email": "procurement@govinnovate.gov.in",
        "password": "GovInnovate2025!",
        "full_name": "Sanjay Verma",
        "organization_name": "Government e-Marketplace (GeM)",
        "designation": "Director, Innovation Procurement & Scale-up",
        "phone_number": "+91-11-2334-9988",
        "domain_expertise": "Public Procurement Orders, Swiss Challenge, GeM Direct Purchase",
    },
    {
        "role": UserRole.ADMIN,
        "email": "admin@govinnovate.gov.in",
        "password": "GovInnovate2025!",
        "full_name": "GovInnovate System Administrator",
        "organization_name": "GovInnovate National Secretariat",
        "designation": "Platform Superadmin",
        "phone_number": "+91-11-2430-0000",
        "domain_expertise": "Platform Administration, RBAC Auditing & Security",
    },
]


def seed_database(db: Session) -> None:
    logger.info("Starting development database seeding...")

    for persona in SEED_PERSONAS:
        email = persona["email"]
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            logger.info(f"User {email} ({persona['role'].value}) already exists. Updating password & attributes.")
            existing.password_hash = hash_password(persona["password"])
            existing.role = persona["role"]
            existing.organization_name = persona["organization_name"]
            existing.designation = persona["designation"]
            existing.phone_number = persona["phone_number"]
            existing.domain_expertise = persona["domain_expertise"]
            existing.is_active = True
            existing.is_verified = True
            db.commit()
            continue

        now = datetime.now(timezone.utc)
        user = User(
            email=email,
            password_hash=hash_password(persona["password"]),
            full_name=persona["full_name"],
            role=persona["role"],
            organization_name=persona["organization_name"],
            designation=persona["designation"],
            phone_number=persona["phone_number"],
            domain_expertise=persona["domain_expertise"],
            is_active=True,
            is_verified=True,
            last_login=now,
        )
        db.add(user)
        db.flush()

        # Handle department link for government user
        if persona["role"] == UserRole.GOVERNMENT and "dept_name" in persona:
            dept = db.query(Department).filter(Department.name == persona["dept_name"]).first()
            if not dept:
                dept = Department(
                    name=persona["dept_name"],
                    code=persona["dept_code"],
                    ministry=persona["ministry"],
                    contact_email=email,
                    nodal_officer_name=persona["full_name"],
                )
                db.add(dept)
                db.flush()
            user.department_id = dept.id
            user.organization_id = dept.id

        # Handle startup link for startup user
        if persona["role"] == UserRole.STARTUP and "company_name" in persona:
            startup = db.query(Startup).filter(Startup.company_name == persona["company_name"]).first()
            if not startup:
                startup = Startup(
                    company_name=persona["company_name"],
                    dpiit_recognized=True,
                    dpiit_number=persona["dpiit_number"],
                    sector=persona["sector"],
                )
                db.add(startup)
                db.flush()
            user.startup_id = startup.id
            user.organization_id = startup.id

        # Record seed event in audit log
        audit = AuditLog(
            user_id=user.id,
            action="SYSTEM_SEED_USER_CREATED",
            entity_type="User",
            entity_id=user.id,
            metadata_json=f'{{"seed": true, "role": "{user.role.value}", "email": "{user.email}"}}',
        )
        db.add(audit)

        db.commit()
        logger.info(f"Created {persona['role'].value} user: {email}")

    # ==============================================================================
    # Seed Departments, Challenges, and KPIs (Development Demo Data)
    # ==============================================================================
    logger.info("Seeding development challenges and KPIs...")
    from app.models.challenge import Challenge, ChallengeStatus
    from app.models.challenge_kpi import ChallengeKPI
    from datetime import timedelta

    gov_user = db.query(User).filter(User.email == "government@govinnovate.gov.in").first()
    if not gov_user:
        logger.warning("Government user not found for challenge seeding.")
        return

    # 1. Departments
    demo_departments = [
        {
            "name": "Municipal Water & Drainage Board",
            "code": "MWDB-01",
            "ministry": "Ministry of Jal Shakti",
            "state_or_central": "State",
            "state": "Maharashtra",
            "contact_email": "water.nodal@govinnovate.gov.in",
            "nodal_officer_name": "Er. Arvind Deshmukh",
            "description": "Public water distribution utility managing 850 km feeder pipeline grid.",
        },
        {
            "name": "Ministry of Road Transport and Highways",
            "code": "MORTH-01",
            "ministry": "Ministry of Road Transport and Highways",
            "state_or_central": "Central",
            "state": "National",
            "contact_email": "transport.nodal@govinnovate.gov.in",
            "nodal_officer_name": "Dr. Rajesh Kumar",
            "description": "National apex highway and traffic engineering authority.",
        },
        {
            "name": "National Health Authority",
            "code": "NHA-01",
            "ministry": "Ministry of Health & Family Welfare",
            "state_or_central": "Central",
            "state": "National",
            "contact_email": "health.nodal@govinnovate.gov.in",
            "nodal_officer_name": "Dr. Sunita Patel",
            "description": "Apex statutory body administering public digital health missions.",
        },
    ]

    dept_map = {}
    for d_info in demo_departments:
        dept = db.query(Department).filter(Department.name == d_info["name"]).first()
        if not dept:
            dept = Department(**d_info)
            db.add(dept)
            db.flush()
        dept_map[d_info["code"]] = dept

    # Assign government user to first department
    if gov_user and not gov_user.department_id:
        gov_user.department_id = dept_map["MWDB-01"].id
        gov_user.organization_name = dept_map["MWDB-01"].name
        db.commit()

    # 2. Challenges
    now = datetime.now(timezone.utc)
    demo_challenges = [
        {
            "challenge_code": "GI-2026-0001",
            "dept_code": "MWDB-01",
            "title": "Reduce Urban Water Leakage in Municipal Supply Grids",
            "problem_statement": "Municipal water distribution networks lose up to 42% of treated potable water due to undetected subsurface pipe bursts and illegal tapping without destructive road digging.",
            "current_state": "Visual manual inspection takes over 72 hours per reported rupture; estimated physical water loss exceeds 14 million litres per day in zone 4.",
            "desired_outcome": "Reduce non-revenue water (NRW) loss by 20% across the 50 km pilot feeder grid with pinpoint acoustic sensor telemetry.",
            "challenge_description": "[Development Demo Data] Field testbed deployment on 50 km city feeder main to test acoustic correlation and pressure transient analytics.",
            "target_beneficiaries": "Over 450,000 municipal consumers in urban wards 12 to 19.",
            "technology_preferences": "Non-invasive clamp acoustic sensors, transient pressure logging, low-power NB-IoT communications.",
            "technology_restrictions": "Must not require excavation or interruption of daytime water pressure.",
            "domain": "CivicTech",
            "geographical_scope": "Municipal",
            "budget_min": 1500000.0,
            "budget_max": 2500000.0,
            "currency": "INR",
            "pilot_duration_days": 120,
            "application_deadline": now + timedelta(days=45),
            "pilot_start_date": now + timedelta(days=60),
            "data_requirements": "Municipal GIS vector maps and SCADA flow logs will be provided under standard bilateral NDA.",
            "security_requirements": "End-to-end TLS 1.3 encryption; sensor telemetry hosted on MeitY empanelled cloud.",
            "compliance_requirements": "Compliance with GFR 2017 Rule 149 and Central Public Health and Environmental Engineering Organisation (CPHEEO) guidelines.",
            "intellectual_property_requirements": "Startup retains 100% background and foreground IP; Government receives perpetual non-exclusive royalty-free departmental licence.",
            "eligibility_requirements": "DPIIT-recognized Indian startups with working prototype at TRL 6 or higher and demonstrable acoustic/sensor capabilities.",
            "status": ChallengeStatus.PUBLISHED,
            "published_at": now - timedelta(days=5),
            "kpis": [
                {
                    "name": "Water leakage reduction",
                    "description": "Reduction of physical volumetric water loss measured against SCADA feeder inputs.",
                    "measurement_unit": "%",
                    "baseline_value": 30.0,
                    "target_value": 20.0,
                    "measurement_method": "Electromagnetic insertion flowmeters and pressure balance audits.",
                    "weight": 40.0,
                },
                {
                    "name": "Detection accuracy",
                    "description": "Spatial proximity of detected subsurface leaks compared to actual rupture point upon excavation.",
                    "measurement_unit": "metres",
                    "baseline_value": 15.0,
                    "target_value": 3.0,
                    "measurement_method": "Ground survey validation upon verified pipe repair.",
                    "weight": 35.0,
                },
                {
                    "name": "Response & notification time",
                    "description": "Time elapsed from anomalous pressure transient event to automated dispatch alert.",
                    "measurement_unit": "hours",
                    "baseline_value": 48.0,
                    "target_value": 4.0,
                    "measurement_method": "Timestamped system alert logs vs verified leak time.",
                    "weight": 25.0,
                },
            ],
        },
        {
            "challenge_code": "GI-2026-0002",
            "dept_code": "MORTH-01",
            "title": "Autonomous Traffic Signal Optimization Using Computer Vision",
            "problem_statement": "Urban traffic junctions face heavy peak-hour congestion resulting in high commuter wait times and excessive vehicle emissions.",
            "current_state": "Fixed-time traffic signal cycles fail to react to dynamic vehicular surges, leading to 25-minute average queues during morning peak hours.",
            "desired_outcome": "Reduce average junction vehicle wait time by at least 40% using adaptive camera telemetry without hardware road disruption.",
            "challenge_description": "[Development Demo Data] 4-junction pilot corridor in central New Delhi to integrate edge AI video inference with existing junction controllers.",
            "target_beneficiaries": "Daily vehicular commuters and public bus transit fleet.",
            "domain": "CivicTech",
            "geographical_scope": "State-Level",
            "budget_min": 1800000.0,
            "budget_max": 2800000.0,
            "currency": "INR",
            "pilot_duration_days": 90,
            "application_deadline": now + timedelta(days=30),
            "pilot_start_date": now + timedelta(days=45),
            "data_requirements": "RTSP video feeds from existing municipal traffic cameras.",
            "security_requirements": "No biometric facial recognition; anonymized vehicle bounding boxes only.",
            "compliance_requirements": "IRC (Indian Roads Congress) signal timing safety regulations.",
            "intellectual_property_requirements": "Vendor retains core algorithmic IP; government receives perpetual operational usage rights.",
            "eligibility_requirements": "DPIIT-registered entity with edge computer vision deployment experience.",
            "status": ChallengeStatus.PUBLISHED,
            "published_at": now - timedelta(days=2),
            "kpis": [
                {
                    "name": "Average junction wait time",
                    "description": "Average stationary duration of commuter vehicles per signal cycle.",
                    "measurement_unit": "%",
                    "baseline_value": 100.0,
                    "target_value": 60.0,
                    "measurement_method": "Independent floating car probe data and GPS fleet traces.",
                    "weight": 50.0,
                },
                {
                    "name": "Queue length estimation accuracy",
                    "description": "Concordance between edge computer vision vehicle count and manual ground truth counts.",
                    "measurement_unit": "%",
                    "baseline_value": 65.0,
                    "target_value": 92.0,
                    "measurement_method": "Benchmarked against manual 15-minute cordon counts.",
                    "weight": 30.0,
                },
                {
                    "name": "Transit signal priority response",
                    "description": "Latency in extending green phase when emergency vehicle or high-occupancy bus approaches.",
                    "measurement_unit": "seconds",
                    "baseline_value": 30.0,
                    "target_value": 3.0,
                    "measurement_method": "Automated controller event logs.",
                    "weight": 20.0,
                },
            ],
        },
        {
            "challenge_code": "GI-2026-0003",
            "dept_code": "NHA-01",
            "title": "AI-Assisted Rural Triage & Diagnostic Telemetry for Primary Health Centres",
            "problem_statement": "Remote primary healthcare centres face acute specialist shortages, causing delayed critical triage and high avoidable patient mortality during emergency transfers.",
            "current_state": "Average rural patient referral assessment time is 4.5 hours due to offline paper records and non-specialist staffing.",
            "desired_outcome": "Demonstrate at least 60% reduction in average triage wait time and greater than 90% diagnostic concordance with district hospital specialists.",
            "challenge_description": "[Development Demo Data - Draft Mode] Multi-modal offline diagnostic decision support tool for sub-district clinics.",
            "target_beneficiaries": "Rural patients in 12 aspirational district PHCs.",
            "domain": "HealthTech",
            "geographical_scope": "National",
            "budget_min": 2000000.0,
            "budget_max": 3500000.0,
            "currency": "INR",
            "pilot_duration_days": 180,
            "application_deadline": now + timedelta(days=60),
            "pilot_start_date": now + timedelta(days=90),
            "data_requirements": "De-identified medical imaging data sets.",
            "security_requirements": "HIPAA & Digital Personal Data Protection Act (DPDP) 2023 compliant zero-retention edge model.",
            "compliance_requirements": "Central Drugs Standard Control Organisation (CDSCO) Class B software as medical device clearance.",
            "intellectual_property_requirements": "Proprietary AI diagnostic weights owned by startup.",
            "eligibility_requirements": "HealthTech startups with clinical trial validation in progress.",
            "status": ChallengeStatus.DRAFT,  # Stays DRAFT for testing draft workflows!
            "kpis": [
                {
                    "name": "Triage wait time reduction",
                    "description": "Time elapsed from patient check-in to automated preliminary risk stratification.",
                    "measurement_unit": "%",
                    "baseline_value": 100.0,
                    "target_value": 40.0,
                    "measurement_method": "Digital outpatient registration timestamps.",
                    "weight": 60.0,
                },
                {
                    "name": "Specialist diagnostic concordance",
                    "description": "Percentage agreement between AI triage recommendation and district physician review.",
                    "measurement_unit": "%",
                    "baseline_value": 50.0,
                    "target_value": 90.0,
                    "measurement_method": "Blinded double-read clinical audits by 3 independent medical officers.",
                    "weight": 40.0,
                },
            ],
        },
    ]

    for c_info in demo_challenges:
        dept = dept_map.get(c_info["dept_code"])
        dept_id = dept.id if dept else gov_user.department_id

        existing_ch = db.query(Challenge).filter(Challenge.challenge_code == c_info["challenge_code"]).first()
        if existing_ch:
            logger.info(f"Challenge {c_info['challenge_code']} already exists. Skipping.")
            continue

        ch = Challenge(
            challenge_code=c_info["challenge_code"],
            department_id=dept_id,
            created_by=gov_user.id,
            title=c_info["title"],
            problem_statement=c_info["problem_statement"],
            current_state=c_info.get("current_state"),
            desired_outcome=c_info["desired_outcome"],
            challenge_description=c_info.get("challenge_description"),
            target_beneficiaries=c_info.get("target_beneficiaries"),
            technology_preferences=c_info.get("technology_preferences"),
            technology_restrictions=c_info.get("technology_restrictions"),
            domain=c_info["domain"],
            geographical_scope=c_info.get("geographical_scope", "National"),
            budget_min=c_info["budget_min"],
            budget_max=c_info["budget_max"],
            currency=c_info.get("currency", "INR"),
            pilot_duration_days=c_info["pilot_duration_days"],
            application_deadline=c_info["application_deadline"],
            pilot_start_date=c_info.get("pilot_start_date"),
            data_requirements=c_info.get("data_requirements"),
            security_requirements=c_info.get("security_requirements"),
            compliance_requirements=c_info.get("compliance_requirements"),
            intellectual_property_requirements=c_info.get("intellectual_property_requirements"),
            eligibility_requirements=c_info.get("eligibility_requirements"),
            status=c_info["status"],
            published_at=c_info.get("published_at"),
        )
        db.add(ch)
        db.flush()

        for kpi_data in c_info["kpis"]:
            kpi = ChallengeKPI(
                challenge_id=ch.id,
                name=kpi_data["name"],
                description=kpi_data.get("description"),
                measurement_unit=kpi_data["measurement_unit"],
                baseline_value=kpi_data.get("baseline_value"),
                target_value=kpi_data["target_value"],
                measurement_method=kpi_data.get("measurement_method"),
                weight=kpi_data.get("weight", 1.0),
            )
            db.add(kpi)

        audit = AuditLog(
            user_id=gov_user.id,
            action="CHALLENGE_CREATED",
            entity_type="Challenge",
            entity_id=ch.id,
            details_json=json.dumps({"challenge_code": ch.challenge_code, "seed": True}),
        )
        db.add(audit)
        db.commit()
        logger.info(f"Created demo challenge: {ch.challenge_code} ({ch.status.value}) - {ch.title[:40]}...")

    # ==========================================================================
    # Step 4: Seed Realistic Development Startups & Applications
    # ==========================================================================
    logger.info("Seeding Step 4 Startups & Technical Applications (DEMO DATA)...")

    # 1. Update/Provision AquaSense Innovations for startup@govinnovate.dev
    startup_user = db.query(User).filter(User.email == "startup@govinnovate.dev").first()
    if startup_user:
        aquasense = None
        if startup_user.startup_id:
            aquasense = db.query(Startup).filter(Startup.id == startup_user.startup_id).first()
        if not aquasense:
            aquasense = db.query(Startup).filter(
                or_(
                    Startup.user_id == startup_user.id,
                    Startup.dpiit_number == "DPIIT-89210",
                    Startup.dpiit_recognition_number == "DPIIT-89210",
                )
            ).first()
        if not aquasense:
            aquasense = Startup(user_id=startup_user.id)
            db.add(aquasense)

        aquasense.startup_name = "AquaSense Innovations"
        aquasense.company_name = "AquaSense Innovations"
        aquasense.legal_name = "AquaSense IoT Technologies Pvt Ltd"
        aquasense.founded_year = 2022
        aquasense.website = "https://aquasense.innovatetech.io"
        aquasense.headquarters = "Bengaluru, Karnataka"
        aquasense.team_size = "11-50"
        aquasense.dpiit_recognition_number = "DPIIT-89210"
        aquasense.dpiit_number = "DPIIT-89210"
        aquasense.recognition_status = "VERIFIED"
        aquasense.dpiit_recognized = True
        aquasense.description = "AquaSense develops low-power acoustic telemetry mesh sensors with edge inference to detect subsurface pipeline leakages and pressure drops in municipal water networks."
        aquasense.technology_domains = json.dumps(["WaterTech", "IoT", "CleanTech"])
        aquasense.solution_categories = json.dumps(["Acoustic Telemetry", "Smart Water Metering", "Edge Anomaly Detection"])
        aquasense.product_stage = "MVP"
        aquasense.stage = "MVP"
        aquasense.operating_regions = json.dumps(["Karnataka", "Maharashtra", "National"])
        aquasense.previous_deployments = "Deployed 50-node trial network in Hubbali-Dharwad municipal water board, detecting 14 subsurface pipe cracks and saving 120,000 liters daily."
        aquasense.government_experience = "Pilot trial agreement with Karnataka Urban Water Supply and Drainage Board (KUWSDB)."
        aquasense.certifications = "ISO 9001:2015, IP68 Ingress Protection"
        aquasense.cybersecurity_certifications = "CERT-In empaneled security audit completed in Nov 2025 (Ref: CERTIN-2025-AQ88)"
        aquasense.contact_email = "contact@aquasense.io"
        aquasense.contact_phone = "+91-80-4122-3344"
        aquasense.sync_legacy_fields()

        db.commit()
        db.refresh(aquasense)
        startup_user.startup_id = aquasense.id
        db.commit()
        logger.info(f"Seeded AquaSense Innovations profile (ID: {aquasense.id})")

    # 2. Provision CivicRoute Labs for civicroute@mobilitytech.dev
    civicroute_user = db.query(User).filter(User.email == "civicroute@mobilitytech.dev").first()
    if not civicroute_user:
        civicroute_user = User(
            email="civicroute@mobilitytech.dev",
            password_hash=hash_password("GovInnovate2025!"),
            full_name="Rohan Mehta",
            role=UserRole.STARTUP,
            organization_name="CivicRoute Labs Pvt Ltd",
            designation="Co-Founder & CTO",
            phone_number="+91-20-2567-8899",
            domain_expertise="Computer Vision, Traffic Engineering",
            is_active=True,
            is_verified=True,
        )
        db.add(civicroute_user)
        db.commit()
        db.refresh(civicroute_user)

    civicroute = db.query(Startup).filter(Startup.user_id == civicroute_user.id).first()
    if not civicroute:
        civicroute = Startup(user_id=civicroute_user.id)
        db.add(civicroute)

    civicroute.startup_name = "CivicRoute Labs"
    civicroute.company_name = "CivicRoute Labs"
    civicroute.legal_name = "CivicRoute Mobility Analytics Private Limited"
    civicroute.founded_year = 2021
    civicroute.headquarters = "Pune, Maharashtra"
    civicroute.team_size = "11-50"
    civicroute.dpiit_recognition_number = "DPIIT-77412"
    civicroute.dpiit_number = "DPIIT-77412"
    civicroute.recognition_status = "VERIFIED"
    civicroute.dpiit_recognized = True
    civicroute.description = "CivicRoute builds decentralized edge-computer vision cameras and adaptive signal controllers that optimize traffic light phasing based on live queue lengths."
    civicroute.technology_domains = json.dumps(["MobilityTech", "AI", "SmartCity"])
    civicroute.solution_categories = json.dumps(["Adaptive Traffic Management", "Edge Computer Vision", "Urban Mobility"])
    civicroute.product_stage = "PRODUCTION"
    civicroute.stage = "PRODUCTION"
    civicroute.operating_regions = json.dumps(["Maharashtra", "Delhi NCR", "Gujarat"])
    civicroute.previous_deployments = "Pimpri-Chinchwad Smart City junction pilot covering 12 major intersections with 28% reduction in peak-hour vehicular delays."
    civicroute.government_experience = "Empaneled Smart City traffic optimization vendor for Pune Municipal Corporation."
    civicroute.certifications = "ISO 27001, CMMI Level 3"
    civicroute.cybersecurity_certifications = "STQC Certified Edge Device Firmware & Cloud API"
    civicroute.contact_email = "partnerships@civicroute.dev"
    civicroute.contact_phone = "+91-20-2567-8899"
    civicroute.sync_legacy_fields()

    db.commit()
    db.refresh(civicroute)
    civicroute_user.startup_id = civicroute.id
    db.commit()
    logger.info(f"Seeded CivicRoute Labs profile (ID: {civicroute.id})")

    # 3. Seed Realistic Applications against Demo Challenges
    ch_water = db.query(Challenge).filter(Challenge.challenge_code == "GI-2026-0001").first()
    ch_traffic = db.query(Challenge).filter(Challenge.challenge_code == "GI-2026-0002").first()

    # Application 1: AquaSense -> GI-2026-0001 (UNDER_REVIEW)
    if ch_water and startup_user and startup_user.startup_id:
        app1 = db.query(Application).filter(Application.application_code == "APP-2026-0001").first()
        if not app1:
            app1 = Application(
                application_code="APP-2026-0001",
                challenge_id=ch_water.id,
                startup_id=startup_user.startup_id,
                submitted_by=startup_user.id,
                status="UNDER_REVIEW",
                proposal_title="Acoustic IoT Hydro-Sensor Matrix for Subsurface Pipeline Burst Early Warning",
                executive_summary="Deploying a non-invasive acoustic sensor mesh clamped to existing municipal distribution mains to detect micro-vibrations indicative of pressure leaks before catastrophic bursts occur.",
                proposal_summary="Deploying a non-invasive acoustic sensor mesh clamped to existing municipal distribution mains to detect micro-vibrations indicative of pressure leaks before catastrophic bursts occur.",
                problem_understanding="Municipal water networks in urban zones lose over 40% of non-revenue water through undetected aging pipeline fissures. Current detection relies on citizen complaints after surface flooding.",
                proposed_solution="Battery-powered non-intrusive acoustic transducers operating on NB-IoT transmitting acoustic frequency samples to a localized edge gateway running wavelet anomaly detection.",
                technical_approach="Edge inference model trained on distinct steel/PVC pipe resonance. Continuous ambient noise filtering with synchronized GPS timestamping to pinpoint leak coordinates within 3 meters.",
                expected_outcomes="Reduces average leak detection duration from 72 hours to under 30 minutes, cutting non-revenue water loss by 45% across the pilot distribution zone.",
                implementation_plan="Phase 1 (Month 1): Site survey and sensor calibration. Phase 2 (Month 2): Mesh installation across 10 km pipeline sector. Phase 3 (Month 3): SCADA integration and validation.",
                pilot_plan="Deploy 40 sensors across Ward 4 (Old City District). Continuous telemetry streamed to Delhi Jal Board central command dashboard.",
                timeline_days=90,
                requested_budget=2200000.0,
                estimated_cost=2450000.0,
                risks="Sensor tampering or battery degradation during monsoon season. Mitigated via IP68 sealed tamper-evident enclosures.",
                dependencies="Permission to access valve chambers and municipal pipeline schematics.",
                data_requirements="Access to historical water flow rates and district metering area (DMA) pressure sensor feeds.",
                security_approach="AES-256 payload encryption with hardware security modules (HSM) on all gateway nodes.",
                ip_approach="Core sensor algorithms remain proprietary to startup; municipal telemetry schemas and pilot data owned entirely by the Government.",
                review_notes="Initial technical screening completed by Jal Shakti nodal engineering cell. Scheduled for detailed review.",
                submitted_at=datetime(2026, 9, 2, 14, 30, tzinfo=timezone.utc),
            )
            db.add(app1)
            db.commit()
            logger.info("Seeded Demo Application APP-2026-0001 (UNDER_REVIEW)")

    # Application 2: CivicRoute -> GI-2026-0002 (SUBMITTED)
    if ch_traffic and civicroute_user and civicroute_user.startup_id:
        app2 = db.query(Application).filter(Application.application_code == "APP-2026-0002").first()
        if not app2:
            app2 = Application(
                application_code="APP-2026-0002",
                challenge_id=ch_traffic.id,
                startup_id=civicroute_user.startup_id,
                submitted_by=civicroute_user.id,
                status="SUBMITTED",
                proposal_title="Edge-Vision Adaptive Traffic Signal Synchronization Engine",
                executive_summary="An edge-computed real-time vehicle density analysis platform that interfaces with existing traffic signal controllers to dynamically modulate green-light duration.",
                proposal_summary="An edge-computed real-time vehicle density analysis platform that interfaces with existing traffic signal controllers to dynamically modulate green-light duration.",
                problem_understanding="Static timer signal cycles cause unnecessary cross-junction vehicle idling, leading to severe congestion and localized vehicular emissions.",
                proposed_solution="Lightweight CCTV edge inference units coupled with reinforcement learning agents controlling local signal controllers via NTCIP protocol.",
                technical_approach="YOLOv8 edge model detecting queue depth, passenger cars, buses, and emergency vehicles. Dynamic green wave orchestration across arterial corridors.",
                expected_outcomes="Targeting a 25% reduction in corridor transit time and 35% decrease in intersection stop-and-go occurrences.",
                implementation_plan="Month 1: Edge camera installation at 6 test intersections. Month 2: Controller interface testing. Month 3: Adaptive algorithm live trials. Month 4: Final impact audit.",
                pilot_plan="Deployment across the 6 busiest intersections on Outer Ring Road corridor.",
                timeline_days=120,
                requested_budget=3100000.0,
                estimated_cost=3400000.0,
                risks="Adverse weather camera occlusion. Mitigated via infrared illumination and sensor failure fallback to scheduled cycle.",
                dependencies="Access to signal control cabinets and municipal camera poles.",
                data_requirements="RTSP video stream access from existing traffic surveillance feeds.",
                security_approach="Zero-retention video privacy: all video processed in memory at the edge, only anonymous count vectors transmitted.",
                ip_approach="Algorithms licensed for municipal use; hardware integration specifications open-sourced.",
                submitted_at=datetime(2026, 9, 3, 11, 15, tzinfo=timezone.utc),
            )
            db.add(app2)
            db.commit()
            logger.info("Seeded Demo Application APP-2026-0002 (SUBMITTED)")

    # Application 3: AquaSense -> GI-2026-0002 (DRAFT)
    if ch_traffic and startup_user and startup_user.startup_id:
        app3 = db.query(Application).filter(Application.application_code == "APP-2026-0003").first()
        if not app3:
            app3 = Application(
                application_code="APP-2026-0003",
                challenge_id=ch_traffic.id,
                startup_id=startup_user.startup_id,
                submitted_by=startup_user.id,
                status="DRAFT",
                proposal_title="Multi-Modal Sensor Integration for Urban Traffic Monitoring (Draft)",
                executive_summary="Exploring multi-sensor acoustic and thermal nodes for ambient traffic monitoring.",
                problem_understanding="Preliminary problem assessment in progress.",
                timeline_days=90,
                requested_budget=1800000.0,
            )
            db.add(app3)
            db.commit()
            logger.info("Seeded Demo Application APP-2026-0003 (DRAFT)")

    # ==========================================================================
    # STEP 5: EXPERT EVALUATION & TRANSPARENT SCORING SEED DATA
    # ==========================================================================
    logger.info("Seeding Step 5 Expert Evaluation & Transparent Scoring artifacts...")

    # 1. Ensure Expert User and ExpertProfile
    expert_user = db.query(User).filter(User.email == "expert@govinnovate.gov.in").first()
    if expert_user:
        expert_prof = db.query(ExpertProfile).filter(ExpertProfile.user_id == expert_user.id).first()
        if not expert_prof:
            expert_prof = ExpertProfile(
                user_id=expert_user.id,
                organization="Indian Institute of Technology Delhi",
                designation="Professor & Senior Technical Evaluator",
                expertise_domains=json.dumps(["IoT", "WaterTech", "Sensor Telemetry", "AI/ML"]),
                years_of_experience=15,
                professional_summary="Chair of Sensor Networks at IIT Delhi. Principal investigator for 8 national telemetry pilot testbeds.",
                certifications="IEEE Senior Member, BIS Committee on Smart Sensors",
                linkedin_url="https://linkedin.com/in/prof-vikram-sen",
                availability_status="AVAILABLE",
            )
            db.add(expert_prof)
            db.commit()
            logger.info("Seeded ExpertProfile for Prof. Vikram Sen")

    # Additional Expert: Dr. Sunita Sharma (CleanTech / Smart Cities)
    expert2 = db.query(User).filter(User.email == "expert.clean@govinnovate.in").first()
    if not expert2:
        expert2 = User(
            email="expert.clean@govinnovate.in",
            password_hash=hash_password("GovInnovate2025!"),
            full_name="Dr. Sunita Sharma",
            role=UserRole.EXPERT,
            organization_name="Council of Scientific and Industrial Research (CSIR)",
            designation="Chief Principal Scientist",
            phone_number="+91-11-2371-0000",
            domain_expertise="Urban Infrastructure, CleanTech, Environmental Monitoring",
            is_active=True,
            is_verified=True,
        )
        db.add(expert2)
        db.flush()

        prof2 = ExpertProfile(
            user_id=expert2.id,
            organization="CSIR - National Environmental Engineering Research Institute",
            designation="Chief Principal Scientist",
            expertise_domains=json.dumps(["CleanTech", "Smart Cities", "Environmental Telemetry", "CivicTech"]),
            years_of_experience=18,
            professional_summary="Advisor to Central Pollution Control Board on automated telemetry systems and municipal compliance.",
            certifications="CPHEEO Technical Committee Member, ISO 14001 Lead Auditor",
            linkedin_url="https://linkedin.com/in/dr-sunita-sharma-csir",
            availability_status="AVAILABLE",
        )
        db.add(prof2)
        db.commit()
        logger.info("Seeded additional Expert Dr. Sunita Sharma (expert.clean@govinnovate.in)")

    # 2. Evaluation Criteria for Challenges
    DEFAULT_CRITERIA_SPECS = [
        {
            "name": "Technical Feasibility & Architecture",
            "description": "Soundness of technical architecture, system design, scalability, and integration with existing government infrastructure.",
            "weight": 25.0,
            "max_score": 10.0,
            "min_score": 0.0,
            "mandatory": True,
            "display_order": 1,
        },
        {
            "name": "Domain Problem Alignment",
            "description": "Depth of understanding of departmental pain points, root causes, and targeted outcome delivery.",
            "weight": 20.0,
            "max_score": 10.0,
            "min_score": 0.0,
            "mandatory": True,
            "display_order": 2,
        },
        {
            "name": "Implementation & Pilot Plan",
            "description": "Realistic milestone planning, deployment readiness within stated days, risk mitigation, and field dependencies.",
            "weight": 20.0,
            "max_score": 10.0,
            "min_score": 0.0,
            "mandatory": True,
            "display_order": 3,
        },
        {
            "name": "Value for Money & Cost Reasonableness",
            "description": "Commercial viability, justification of requested pilot budget against deliverables and industry benchmarks.",
            "weight": 15.0,
            "max_score": 10.0,
            "min_score": 0.0,
            "mandatory": True,
            "display_order": 4,
        },
        {
            "name": "Team Capability & Past Track Record",
            "description": "Core competencies of founding/technical team, previous deployments, and security/compliance certifications.",
            "weight": 20.0,
            "max_score": 10.0,
            "min_score": 0.0,
            "mandatory": True,
            "display_order": 5,
        },
    ]

    all_challenges = db.query(Challenge).all()
    for ch in all_challenges:
        existing_crit = db.query(EvaluationCriteria).filter(EvaluationCriteria.challenge_id == ch.id).all()
        if not existing_crit:
            for spec in DEFAULT_CRITERIA_SPECS:
                c_item = EvaluationCriteria(
                    challenge_id=ch.id,
                    name=spec["name"],
                    description=spec["description"],
                    weight=spec["weight"],
                    max_score=spec["max_score"],
                    min_score=spec["min_score"],
                    mandatory=spec["mandatory"],
                    display_order=spec["display_order"],
                )
                db.add(c_item)
            db.commit()
            logger.info(f"Seeded 5 Evaluation Criteria for Challenge {ch.challenge_code} (Total Weight: 100%)")

    # 3. Seed Completed Evaluation for APP-2026-0001 (AquaSense)
    app1 = db.query(Application).filter(Application.application_code == "APP-2026-0001").first()
    if app1 and expert_user:
        # Check existing assignment
        asgn1 = db.query(EvaluationAssignment).filter(
            EvaluationAssignment.application_id == app1.id,
            EvaluationAssignment.expert_id == expert_user.id,
        ).first()

        gov_user = db.query(User).filter(User.role == UserRole.GOVERNMENT).first()
        assigner_id = gov_user.id if gov_user else expert_user.id

        if not asgn1:
            asgn1 = EvaluationAssignment(
                application_id=app1.id,
                expert_id=expert_user.id,
                assigned_by=assigner_id,
                assignment_status=AssignmentStatus.COMPLETED.value,
                assigned_at=datetime(2026, 9, 3, 9, 0, tzinfo=timezone.utc),
                accepted_at=datetime(2026, 9, 3, 10, 0, tzinfo=timezone.utc),
                completed_at=datetime(2026, 9, 4, 16, 30, tzinfo=timezone.utc),
                notes="Assigned for primary independent technical evaluation.",
            )
            db.add(asgn1)
            db.flush()

        # Seed Conflict of Interest
        coi1 = db.query(ConflictOfInterest).filter(ConflictOfInterest.assignment_id == asgn1.id).first()
        if not coi1:
            coi1 = ConflictOfInterest(
                assignment_id=asgn1.id,
                expert_id=expert_user.id,
                declaration=ConflictDeclaration.NO_CONFLICT.value,
                declared_at=datetime(2026, 9, 3, 10, 5, tzinfo=timezone.utc),
            )
            db.add(coi1)
            db.flush()

        # Seed Evaluation and Criterion Scores
        eval1 = db.query(Evaluation).filter(Evaluation.assignment_id == asgn1.id).first()
        if not eval1:
            eval1 = Evaluation(
                assignment_id=asgn1.id,
                application_id=app1.id,
                expert_id=expert_user.id,
                evaluator_id=expert_user.id,
                overall_score=84.0,
                composite_score=84.0,
                recommendation=EvaluationRecommendation.STRONGLY_RECOMMEND,
                overall_comments="Exceptionally strong IoT telemetry proposal with proven field trial evidence from Hubbali-Dharwad. Non-invasive acoustic clamp method satisfies zero-excavation mandate. Recommended for pilot sandbox deployment.",
                evaluator_feedback="Exceptionally strong IoT telemetry proposal with proven field trial evidence from Hubbali-Dharwad. Non-invasive acoustic clamp method satisfies zero-excavation mandate. Recommended for pilot sandbox deployment.",
                is_submitted=True,
                is_finalized="true",
                submitted_at=datetime(2026, 9, 4, 16, 30, tzinfo=timezone.utc),
            )
            db.add(eval1)
            db.flush()

            # Criterion scores: 8.5, 9.0, 8.0, 8.5, 8.0
            ch1_criteria = db.query(EvaluationCriteria).filter(EvaluationCriteria.challenge_id == app1.challenge_id).order_by(EvaluationCriteria.display_order.asc()).all()
            sample_scores = [8.5, 9.0, 8.0, 8.5, 8.0]
            for idx, crit in enumerate(ch1_criteria):
                sc_val = sample_scores[idx % len(sample_scores)]
                sc_entry = EvaluationScore(
                    evaluation_id=eval1.id,
                    criterion_id=crit.id,
                    score=sc_val,
                    comment=f"Criterion evaluated satisfactorily at {sc_val}/10.",
                    evidence_reference="Section 3 & Hubbali municipal test report.",
                )
                db.add(sc_entry)

            db.commit()
            logger.info("Seeded complete expert evaluation for APP-2026-0001 (Score: 84.0, STRONGLY_RECOMMEND)")

    # ==========================================================================
    # STEP 6: OPERATIONAL PILOT MANAGEMENT & MILESTONE TRACKING SEED DATA
    # ==========================================================================
    logger.info("Seeding Step 6 Pilot Management & Milestone Tracking artifacts...")

    gov_user = db.query(User).filter(User.role == UserRole.GOVERNMENT).first()
    startup_user = db.query(User).filter(User.email == "startup@govinnovate.dev").first()
    civicroute_user = db.query(User).filter(User.email == "civicroute@mobilitytech.dev").first()
    ch_water = db.query(Challenge).filter(Challenge.challenge_code == "GI-2026-0001").first()
    ch_traffic = db.query(Challenge).filter(Challenge.challenge_code == "GI-2026-0002").first()

    aquasense_st = db.query(Startup).filter(Startup.company_name == "AquaSense Innovations").first()
    civicroute_st = db.query(Startup).filter(Startup.company_name == "CivicRoute Labs").first()

    # 1. Seed two Shortlisted Applications ready for pilot creation wizard testing
    app_sl1 = db.query(Application).filter(Application.application_code == "APP-2026-0004").first()
    if not app_sl1 and ch_water and aquasense_st:
        app_sl1 = Application(
            application_code="APP-2026-0004",
            challenge_id=ch_water.id,
            startup_id=aquasense_st.id,
            submitted_by=startup_user.id if startup_user else None,
            status="SHORTLISTED",
            proposal_title="Autonomous Acoustic Hydro-Grid Pressure Management Sandbox",
            executive_summary="Deployment of high-frequency acoustic monitoring to track micro-pressure transients across municipal distribution zones.",
            problem_understanding="Transient pressure surges cause repeated pipe joint shearing in aged cast-iron water networks.",
            proposed_solution="Battery-operated clamp-on transient recorders with real-time LTE-M telemetry.",
            implementation_plan="120-day phased installation and live SCADA correlation.",
            requested_budget=850000.0,
            timeline_days=120,
            submitted_at=datetime(2026, 9, 3, 15, 0, tzinfo=timezone.utc),
        )
        db.add(app_sl1)
        db.commit()
        logger.info("Seeded Shortlisted Application APP-2026-0004 (Ready for Pilot Creation Wizard)")

    app_sl2 = db.query(Application).filter(Application.application_code == "APP-2026-0005").first()
    if not app_sl2 and ch_traffic and civicroute_st:
        app_sl2 = Application(
            application_code="APP-2026-0005",
            challenge_id=ch_traffic.id,
            startup_id=civicroute_st.id,
            submitted_by=civicroute_user.id if civicroute_user else None,
            status="SHORTLISTED",
            proposal_title="Edge-AI Adaptive Emergency Corridor Traffic Clearance Sandbox",
            executive_summary="Computer vision edge controllers for dynamic green corridor preemption for ambulances and fire tenders.",
            problem_understanding="Emergency transit delays through congested urban signal junctions.",
            proposed_solution="Edge camera detection of emergency sirens and strobe beacons triggering immediate priority green signals.",
            implementation_plan="90-day sandbox trial on Ring Road emergency hospital route.",
            requested_budget=1100000.0,
            timeline_days=90,
            submitted_at=datetime(2026, 9, 4, 11, 0, tzinfo=timezone.utc),
        )
        db.add(app_sl2)
        db.commit()
        logger.info("Seeded Shortlisted Application APP-2026-0005 (Ready for Pilot Creation Wizard)")

    # 2. Seed Pilot 1 (PILOT-2026-0001): ACTIVE Operational Sandbox Pilot
    app1 = db.query(Application).filter(Application.application_code == "APP-2026-0001").first()
    if app1 and ch_water and aquasense_st:
        pilot1 = db.query(Pilot).filter(Pilot.pilot_code == "PILOT-2026-0001").first()
        if not pilot1:
            pilot1 = Pilot(
                pilot_code="PILOT-2026-0001",
                application_id=app1.id,
                challenge_id=ch_water.id,
                startup_id=aquasense_st.id,
                government_department_id=ch_water.department_id,
                pilot_title="Smart Water Grid Telemetry & Non-Invasive Acoustic Sandbox",
                title="Smart Water Grid Telemetry & Non-Invasive Acoustic Sandbox",
                objective="Deploy 50 non-invasive acoustic sensors along Jal Jeevan bulk supply lines to validate real-time leak detection accuracy within 48 hours.",
                scope="Phased field rollout of acoustic clamp-on telemetry units across 15km feeder network, edge inference testing, SCADA ingestion integration, and nodal alert dashboarding.",
                scope_of_work="Phased field rollout of acoustic clamp-on telemetry units across 15km feeder network, edge inference testing, SCADA ingestion integration, and nodal alert dashboarding.",
                problem_statement="Municipal water distribution zones lose over 35% non-revenue water through undetected subsurface fractures.",
                proposed_solution="Non-invasive acoustic telemetry nodes operating on NB-IoT transmitting frequency samples to cloud wavelet analysis.",
                expected_outcomes="Detect 90% of leaks within 3 meters precision and reduce non-revenue water loss by 40%.",
                pilot_location="Delhi Cantt Distribution Sector 4, Jal Jeevan Mission Sandbox",
                sandbox_location="Delhi Cantt Distribution Sector 4, Jal Jeevan Mission Sandbox",
                operating_regions="Delhi NCR, North Zone",
                start_date=date(2026, 8, 1),
                planned_end_date=date(2026, 11, 30),
                end_date=date(2026, 11, 30),
                duration_days=120,
                duration_weeks=17,
                pilot_budget=750000.0,
                approved_budget=750000.0,
                currency="INR",
                status=PilotStatus.ACTIVE.value,
                approval_status=PilotApprovalStatus.APPROVED.value,
                success_status=PilotSuccessStatus.NOT_ASSESSED.value,
                government_owner_id=gov_user.id if gov_user else None,
                startup_owner_id=startup_user.id if startup_user else None,
                created_by=gov_user.id if gov_user else None,
            )
            db.add(pilot1)
            db.flush()

            # Seed 4 Milestones (Total weight = 100%)
            m1 = Milestone(
                pilot_id=pilot1.id,
                milestone_code="MS-PILOT-2026-0001-01",
                sequence_number=1,
                title="Site Survey & Baseline Sensor Calibration",
                objective="Complete pipeline acoustic baseline survey and calibrate 50 transducer clamp units.",
                description="Field survey of 15km pipeline corridor, GPS mapping of valve chambers, and baseline vibration profile logging.",
                deliverable_description="Field survey of 15km pipeline corridor, GPS mapping of valve chambers, and baseline vibration profile logging.",
                planned_start_date=date(2026, 8, 1),
                planned_end_date=date(2026, 8, 31),
                due_date=date(2026, 8, 31),
                actual_start_date=date(2026, 8, 1),
                actual_end_date=date(2026, 8, 28),
                completion_date=date(2026, 8, 28),
                weight=25.0,
                completion_percentage=100.0,
                status=MilestoneStatus.ACCEPTED.value,
                acceptance_status=MilestoneAcceptanceStatus.ACCEPTED.value,
                tranche_amount=187500.0,
            )
            db.add(m1)
            db.flush()

            # Deliverable for M1 (ACCEPTED)
            d1 = PilotDeliverable(
                milestone_id=m1.id,
                pilot_id=pilot1.id,
                submitted_by=startup_user.id if startup_user else None,
                title="Baseline Calibration & Pipe Acoustic Spectrum Survey",
                description="Comprehensive frequency spectrum report covering 15km feeder lines across Delhi Cantt with baseline noise profiles.",
                file_name="delhi_cantt_baseline_acoustic_survey_v1.pdf",
                storage_key="seed_delhi_cantt_baseline_v1.pdf",
                mime_type="application/pdf",
                file_size=2458120,
                submission_version=1,
                status=DeliverableStatus.ACCEPTED.value,
                submitted_at=datetime(2026, 8, 25, 14, 0, tzinfo=timezone.utc),
                reviewed_at=datetime(2026, 8, 28, 11, 30, tzinfo=timezone.utc),
                reviewed_by=gov_user.id if gov_user else None,
                review_comments="Comprehensive survey report. Sensor frequency calibration meets Jal Jeevan standards. Approved for milestone completion.",
            )
            db.add(d1)

            # M2 (SUBMITTED with Deliverable under review)
            m2 = Milestone(
                pilot_id=pilot1.id,
                milestone_code="MS-PILOT-2026-0001-02",
                sequence_number=2,
                title="Telemetry Gateway Deployment & SCADA Ingestion",
                objective="Deploy 5 cellular/NB-IoT gateways and integrate telemetry stream into Central Water Command SCADA.",
                description="Installation of solar-assisted outdoor gateways and end-to-end MQTT/HTTPS telemetry transmission.",
                deliverable_description="Installation of solar-assisted outdoor gateways and end-to-end MQTT/HTTPS telemetry transmission.",
                planned_start_date=date(2026, 9, 1),
                planned_end_date=date(2026, 9, 30),
                due_date=date(2026, 9, 30),
                actual_start_date=date(2026, 9, 1),
                weight=25.0,
                completion_percentage=100.0,
                status=MilestoneStatus.SUBMITTED.value,
                acceptance_status=MilestoneAcceptanceStatus.PENDING.value,
                tranche_amount=187500.0,
            )
            db.add(m2)
            db.flush()

            d2 = PilotDeliverable(
                milestone_id=m2.id,
                pilot_id=pilot1.id,
                submitted_by=startup_user.id if startup_user else None,
                title="Gateway Telemetry Stream & SCADA Handshake Proof",
                description="Telemetry verification logs showing 99.4% packet reception over 7-day live streaming run to municipal SCADA endpoint.",
                file_name="scada_ingestion_handshake_report_v1.pdf",
                storage_key="seed_scada_ingestion_handshake_v1.pdf",
                mime_type="application/pdf",
                file_size=1845120,
                submission_version=1,
                status=DeliverableStatus.SUBMITTED.value,
                submitted_at=datetime(2026, 9, 5, 16, 0, tzinfo=timezone.utc),
            )
            db.add(d2)

            # M3 (IN_PROGRESS)
            m3 = Milestone(
                pilot_id=pilot1.id,
                milestone_code="MS-PILOT-2026-0001-03",
                sequence_number=3,
                title="Synthetic Leak Injection & Field Localization Trials",
                objective="Perform 5 controlled release leak simulations and verify acoustic pinpoint accuracy within 3 meters.",
                description="Controlled hydrant bleed-offs and pipeline orifice simulation to benchmark algorithm detection response time.",
                deliverable_description="Controlled hydrant bleed-offs and pipeline orifice simulation to benchmark algorithm detection response time.",
                planned_start_date=date(2026, 10, 1),
                planned_end_date=date(2026, 10, 31),
                due_date=date(2026, 10, 31),
                actual_start_date=date(2026, 9, 6),
                weight=25.0,
                completion_percentage=40.0,
                status=MilestoneStatus.IN_PROGRESS.value,
                acceptance_status=MilestoneAcceptanceStatus.PENDING.value,
                tranche_amount=187500.0,
            )
            db.add(m3)

            # M4 (NOT_STARTED)
            m4 = Milestone(
                pilot_id=pilot1.id,
                milestone_code="MS-PILOT-2026-0001-04",
                sequence_number=4,
                title="Final Operational Sandbox Efficacy Report & Handover",
                objective="Synthesize 120-day sandbox operational findings, cost-benefit analysis, and transition documentation.",
                description="Complete evaluation dossier detailing non-revenue water savings, false positive rates, and scaling guidelines.",
                deliverable_description="Complete evaluation dossier detailing non-revenue water savings, false positive rates, and scaling guidelines.",
                planned_start_date=date(2026, 11, 1),
                planned_end_date=date(2026, 11, 30),
                due_date=date(2026, 11, 30),
                weight=25.0,
                completion_percentage=0.0,
                status=MilestoneStatus.NOT_STARTED.value,
                acceptance_status=MilestoneAcceptanceStatus.PENDING.value,
                tranche_amount=187500.0,
            )
            db.add(m4)

            app1.status = "SELECTED_FOR_PILOT"
            db.commit()
            logger.info("Seeded Demo Pilot PILOT-2026-0001 (ACTIVE, Progress: 60.0%, 4 Milestones)")

    # 3. Seed Pilot 2 (PILOT-2026-0002): COMPLETED Pilot Sandbox (Ready for Step 7 KPI Validation)
    app2 = db.query(Application).filter(Application.application_code == "APP-2026-0002").first()
    if app2 and ch_traffic and civicroute_st:
        pilot2 = db.query(Pilot).filter(Pilot.pilot_code == "PILOT-2026-0002").first()
        if not pilot2:
            pilot2 = Pilot(
                pilot_code="PILOT-2026-0002",
                application_id=app2.id,
                challenge_id=ch_traffic.id,
                startup_id=civicroute_st.id,
                government_department_id=ch_traffic.department_id,
                pilot_title="Adaptive Traffic Signal Optimization & Edge-Vision Sandbox",
                title="Adaptive Traffic Signal Optimization & Edge-Vision Sandbox",
                objective="Deploy adaptive green wave signal controllers across 6 major intersections on Outer Ring Road corridor.",
                scope="Edge computer vision camera installation, NTCIP controller interfacing, reinforcement learning optimization, and transit delay audit.",
                scope_of_work="Edge computer vision camera installation, NTCIP controller interfacing, reinforcement learning optimization, and transit delay audit.",
                problem_statement="Severe corridor vehicular congestion due to static timer traffic signal phasing.",
                proposed_solution="Real-time edge camera vehicle queue classification dynamically modulating signal phases.",
                expected_outcomes="Reduce peak-hour vehicular delays by 25% and corridor travel time by 20%.",
                pilot_location="Outer Ring Road Corridor (Marathahalli to Sarjapur Sector), Urban Mobility Sandbox",
                sandbox_location="Outer Ring Road Corridor (Marathahalli to Sarjapur Sector), Urban Mobility Sandbox",
                operating_regions="Karnataka, Bengaluru Urban",
                start_date=date(2026, 5, 1),
                planned_end_date=date(2026, 8, 31),
                end_date=date(2026, 8, 31),
                actual_end_date=date(2026, 8, 30),
                duration_days=120,
                duration_weeks=17,
                pilot_budget=1200000.0,
                approved_budget=1200000.0,
                currency="INR",
                status=PilotStatus.COMPLETED.value,
                approval_status=PilotApprovalStatus.APPROVED.value,
                success_status=PilotSuccessStatus.NOT_ASSESSED.value,  # STRICT STEP 6 REQUIREMENT: Remains NOT_ASSESSED!
                government_owner_id=gov_user.id if gov_user else None,
                startup_owner_id=civicroute_user.id if civicroute_user else None,
                created_by=gov_user.id if gov_user else None,
            )
            db.add(pilot2)
            db.flush()

            # Seed 3 Completed & Accepted Milestones (Total weight = 100%, Progress = 100%)
            pm1 = Milestone(
                pilot_id=pilot2.id,
                milestone_code="MS-PILOT-2026-0002-01",
                sequence_number=1,
                title="Edge Camera Hardware & Junction Sensor Deployment",
                objective="Mount and calibrate 24 edge computer vision cameras across 6 junctions.",
                planned_start_date=date(2026, 5, 1),
                planned_end_date=date(2026, 5, 31),
                due_date=date(2026, 5, 31),
                actual_start_date=date(2026, 5, 1),
                actual_end_date=date(2026, 5, 29),
                completion_date=date(2026, 5, 29),
                weight=30.0,
                completion_percentage=100.0,
                status=MilestoneStatus.ACCEPTED.value,
                acceptance_status=MilestoneAcceptanceStatus.ACCEPTED.value,
                tranche_amount=360000.0,
            )
            db.add(pm1)
            db.flush()

            pd1 = PilotDeliverable(
                milestone_id=pm1.id,
                pilot_id=pilot2.id,
                submitted_by=civicroute_user.id if civicroute_user else None,
                title="Hardware Installation & Junction Geometry Acceptance Report",
                file_name="junction_geometry_hardware_report_v1.pdf",
                storage_key="seed_junction_hardware_v1.pdf",
                mime_type="application/pdf",
                file_size=3120400,
                submission_version=1,
                status=DeliverableStatus.ACCEPTED.value,
                submitted_at=datetime(2026, 5, 28, 12, 0, tzinfo=timezone.utc),
                reviewed_at=datetime(2026, 5, 29, 15, 0, tzinfo=timezone.utc),
                reviewed_by=gov_user.id if gov_user else None,
                review_comments="All 24 cameras inspected and aligned. Optical resolution and night IR performance verified.",
            )
            db.add(pd1)

            pm2 = Milestone(
                pilot_id=pilot2.id,
                milestone_code="MS-PILOT-2026-0002-02",
                sequence_number=2,
                title="NTCIP Signal Controller Integration & Local Policy Tuning",
                objective="Interface edge inference box with Siemens/Tyco signal controllers and tune local cycle limits.",
                planned_start_date=date(2026, 6, 1),
                planned_end_date=date(2026, 6, 30),
                due_date=date(2026, 6, 30),
                actual_start_date=date(2026, 6, 1),
                actual_end_date=date(2026, 6, 28),
                completion_date=date(2026, 6, 28),
                weight=30.0,
                completion_percentage=100.0,
                status=MilestoneStatus.ACCEPTED.value,
                acceptance_status=MilestoneAcceptanceStatus.ACCEPTED.value,
                tranche_amount=360000.0,
            )
            db.add(pm2)
            db.flush()

            pd2 = PilotDeliverable(
                milestone_id=pm2.id,
                pilot_id=pilot2.id,
                submitted_by=civicroute_user.id if civicroute_user else None,
                title="Controller Interface Protocol & Safety Interlock Audit",
                file_name="ntcip_safety_interlock_audit_v1.pdf",
                storage_key="seed_ntcip_interlock_v1.pdf",
                mime_type="application/pdf",
                file_size=2190200,
                submission_version=1,
                status=DeliverableStatus.ACCEPTED.value,
                submitted_at=datetime(2026, 6, 27, 10, 0, tzinfo=timezone.utc),
                reviewed_at=datetime(2026, 6, 28, 14, 30, tzinfo=timezone.utc),
                reviewed_by=gov_user.id if gov_user else None,
                review_comments="Safety fallback interlock successfully tested. Failsafe to yellow flash confirmed on simulated communication loss.",
            )
            db.add(pd2)

            pm3 = Milestone(
                pilot_id=pilot2.id,
                milestone_code="MS-PILOT-2026-0002-03",
                sequence_number=3,
                title="Corridor Adaptive Green Wave Live Run & Final Impact Audit",
                objective="Continuous 60-day coordinated adaptive green wave operation across the 6 corridor junctions.",
                planned_start_date=date(2026, 7, 1),
                planned_end_date=date(2026, 8, 31),
                due_date=date(2026, 8, 31),
                actual_start_date=date(2026, 7, 1),
                actual_end_date=date(2026, 8, 30),
                completion_date=date(2026, 8, 30),
                weight=40.0,
                completion_percentage=100.0,
                status=MilestoneStatus.ACCEPTED.value,
                acceptance_status=MilestoneAcceptanceStatus.ACCEPTED.value,
                tranche_amount=480000.0,
            )
            db.add(pm3)
            db.flush()

            pd3 = PilotDeliverable(
                milestone_id=pm3.id,
                pilot_id=pilot2.id,
                submitted_by=civicroute_user.id if civicroute_user else None,
                title="Final 60-Day Corridor Telemetry & Delay Reduction Analysis",
                file_name="corridor_delay_reduction_impact_v1.pdf",
                storage_key="seed_corridor_impact_v1.pdf",
                mime_type="application/pdf",
                file_size=4890100,
                submission_version=1,
                status=DeliverableStatus.ACCEPTED.value,
                submitted_at=datetime(2026, 8, 29, 11, 0, tzinfo=timezone.utc),
                reviewed_at=datetime(2026, 8, 30, 16, 0, tzinfo=timezone.utc),
                reviewed_by=gov_user.id if gov_user else None,
                review_comments="Outstanding operational milestone results. Telemetry demonstrates 27.8% delay reduction. Milestone accepted. Pilot sandbox completed.",
            )
            db.add(pd3)

            app2.status = "SELECTED_FOR_PILOT"
            db.commit()
            logger.info("Seeded Demo Pilot PILOT-2026-0002 (COMPLETED, Progress: 100.0%, success_status: NOT_ASSESSED)")

    # -------------------------------------------------------------
    # STEP 7 SEEDING: VALIDATOR PROFILES, KPIS, MEASUREMENTS, REPORTS
    # -------------------------------------------------------------
    val_user1 = db.query(User).filter(User.email == "validator@govinnovate.org").first()
    val_user2 = db.query(User).filter(User.email == "validator2@govinnovate.org").first()

    if val_user1:
        vp1 = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == val_user1.id).first()
        if not vp1:
            vp1 = ValidatorProfile(
                user_id=val_user1.id,
                organization="Standardisation Testing and Quality Certification Directorate (STQC)",
                domain_expertise="GFR 2017 Compliance, Software Quality, IoT Edge Telemetry Verification",
                qualifications="Ph.D. in Computer Science, ISO/IEC 17025 Lead Assessor",
                accreditations="NABL Accredited Laboratory #TC-5120, STQC Certified Security Auditor",
                years_of_experience=14,
                validation_count=12,
                rating=4.95,
                availability=ValidatorAvailability.AVAILABLE.value,
                contact_phone="+91-11-2436-5432",
                is_verified=True,
            )
            db.add(vp1)
            db.flush()
            logger.info("Seeded Validator Profile for Dr. Sunita Patel (STQC)")

    if val_user2:
        vp2 = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == val_user2.id).first()
        if not vp2:
            vp2 = ValidatorProfile(
                user_id=val_user2.id,
                organization="National Physical Laboratory & Metrology Standards",
                domain_expertise="Sensor Calibration, Field IoT Telemetry, Industrial Systems Verification",
                qualifications="M.Tech in Instrumentation, Certified Reliability Engineer",
                accreditations="BIPM International Metrology Representative, ISO 9001 Lead Auditor",
                years_of_experience=18,
                validation_count=20,
                rating=4.88,
                availability=ValidatorAvailability.AVAILABLE.value,
                contact_phone="+91-11-4567-8901",
                is_verified=True,
            )
            db.add(vp2)
            db.flush()
            logger.info("Seeded Validator Profile for Er. Arvind Narayanan (NPL)")

    # Seed KPIs and Validation Workflow for Pilot 2 (PILOT-2026-0002)
    p2 = db.query(Pilot).filter(Pilot.pilot_code == "PILOT-2026-0002").first()
    if p2:
        existing_kpis = db.query(PilotKPI).filter(PilotKPI.pilot_id == p2.id).count()
        if existing_kpis == 0:
            # KPI 1: Corridor Congestion Delay Reduction
            k1 = PilotKPI(
                pilot_id=p2.id,
                name="Corridor Congestion Delay Reduction",
                description="Percentage reduction in average vehicular delay across the 6 synchronized pilot corridor junctions compared to baseline uncoordinated timings.",
                category=KPICategory.EFFICIENCY.value,
                measurement_type=KPIMeasurementType.PERCENTAGE.value,
                unit="%",
                baseline_value=0.0,
                baseline_date=date(2026, 6, 1),
                baseline_source="Pre-pilot municipal loop detector survey (June 2026)",
                baseline_notes="Baseline uncoordinated cycle delay: 142 seconds per vehicle.",
                target_value=25.0,
                target_date=date(2026, 8, 31),
                target_operator=TargetOperator.GREATER_THAN_OR_EQUAL.value,
                direction=KPIDirection.HIGHER_IS_BETTER.value,
                weight=2.0,
                status=KPIStatus.ACTIVE.value,
                verification_method="Automated camera telemetry matching and loop detector timestamps over 60 consecutive peak hours.",
                data_source="Municipal Traffic Management System API & Edge Vision Nodes",
                target_description="Achieve at least 25% decrease in peak delay across the entire corridor.",
                created_by=gov_user.id if gov_user else None,
            )
            db.add(k1)
            db.flush()

            # KPI 2: Emergency Vehicle Preemption Response Time
            k2 = PilotKPI(
                pilot_id=p2.id,
                name="Emergency Vehicle Preemption Response Time",
                description="Average time in seconds from emergency strobe detection to corridor-wide green signal preemption grant.",
                category=KPICategory.TIME.value,
                measurement_type=KPIMeasurementType.TIME.value,
                unit="seconds",
                baseline_value=120.0,
                baseline_date=date(2026, 6, 1),
                baseline_source="Manual traffic police radio dispatch records",
                baseline_notes="Manual preemption required manual telephone call to control room taking over 2 minutes.",
                target_value=45.0,
                target_date=date(2026, 8, 31),
                target_operator=TargetOperator.LESS_THAN_OR_EQUAL.value,
                direction=KPIDirection.LOWER_IS_BETTER.value,
                weight=1.5,
                status=KPIStatus.ACTIVE.value,
                verification_method="Simulated ambulance and fire tender runs logged via onboard GPS transponders.",
                data_source="City Ambulance GPS Transponders & Controller Preemption Logs",
                target_description="Preemption granted within 45 seconds of approaching intersection.",
                created_by=gov_user.id if gov_user else None,
            )
            db.add(k2)
            db.flush()

            # KPI 3: Citizen Commute Satisfaction Index
            k3 = PilotKPI(
                pilot_id=p2.id,
                name="Citizen Commute Satisfaction Index",
                description="Positive rating percentage from commuters surveyed along the corridor during live operations.",
                category=KPICategory.USER_SATISFACTION.value,
                measurement_type=KPIMeasurementType.PERCENTAGE.value,
                unit="%",
                baseline_value=58.0,
                baseline_date=date(2026, 6, 1),
                baseline_source="Pre-pilot commuter sentiment survey (500 respondents)",
                baseline_notes="Commuters reported severe bottlenecking at 3 major roundabouts.",
                target_value=85.0,
                target_date=date(2026, 8, 31),
                target_operator=TargetOperator.GREATER_THAN_OR_EQUAL.value,
                direction=KPIDirection.HIGHER_IS_BETTER.value,
                weight=1.0,
                status=KPIStatus.ACTIVE.value,
                verification_method="Digital survey via municipal citizen portal and bus commuter QR surveys (N=1,200).",
                data_source="MyGov / Municipal Citizen Survey Portal",
                target_description="Satisfaction index equal to or exceeding 85%.",
                created_by=gov_user.id if gov_user else None,
            )
            db.add(k3)
            db.flush()

            # Measurements for KPI 1
            m1 = KPIMeasurement(
                kpi_id=k1.id,
                pilot_id=p2.id,
                measured_value=27.8,
                measurement_date=date(2026, 8, 28),
                reporting_period_start=date(2026, 7, 1),
                reporting_period_end=date(2026, 8, 28),
                measured_by=civicroute_user.id if civicroute_user else None,
                measurement_method="60-day continuous radar & video telemetry aggregated across 1.2M vehicle crossings.",
                data_sources_used="CivicRoute CorriPulse Edge Telemetry Engine",
                sample_size=1240000,
                calculation_notes="Average delay reduced from 142.4s to 102.8s (27.81% reduction).",
                status=MeasurementStatus.VERIFIED.value,
            )
            db.add(m1)
            db.flush()

            # Evidence for KPI 1
            e1 = KPIEvidence(
                kpi_id=k1.id,
                measurement_id=m1.id,
                pilot_id=p2.id,
                title="60-Day Corridor Delay Reduction Dataset & Raw Telemetry",
                description="Comprehensive CSV dataset containing second-by-second vehicle queue lengths, cycle splits, and delay metrics.",
                evidence_type=EvidenceType.DATASET.value,
                file_name="corridor_delay_telemetry_60days.csv",
                storage_key="seed_evidence_corridor_delay.csv",
                mime_type="text/csv",
                file_size=15420000,
                version=1,
                source="CivicRoute Edge Sensors",
                status=EvidenceStatus.VERIFIED.value,
                submitted_by=civicroute_user.id if civicroute_user else None,
                submitted_at=datetime(2026, 8, 28, 14, 0, tzinfo=timezone.utc),
            )
            db.add(e1)

            # Measurements for KPI 2
            m2 = KPIMeasurement(
                kpi_id=k2.id,
                pilot_id=p2.id,
                measured_value=38.4,
                measurement_date=date(2026, 8, 27),
                reporting_period_start=date(2026, 7, 1),
                reporting_period_end=date(2026, 8, 27),
                measured_by=civicroute_user.id if civicroute_user else None,
                measurement_method="GPS transponder synchronized log review of 84 emergency transit events.",
                data_sources_used="City Health Department Ambulance GPS & Traffic Controller Log",
                sample_size=84,
                calculation_notes="Mean preemption delay: 38.4 seconds (Target was <= 45 seconds).",
                status=MeasurementStatus.VERIFIED.value,
            )
            db.add(m2)
            db.flush()

            # Evidence for KPI 2
            e2 = KPIEvidence(
                kpi_id=k2.id,
                measurement_id=m2.id,
                pilot_id=p2.id,
                title="Emergency Vehicle Transit Logs & Preemption Verification",
                description="Audited event log of 84 emergency ambulance crossings during pilot duration.",
                evidence_type=EvidenceType.TELEMETRY_LOG.value,
                file_name="emergency_preemption_audit_logs.pdf",
                storage_key="seed_evidence_emergency_logs.pdf",
                mime_type="application/pdf",
                file_size=3240000,
                version=1,
                source="Delhi Emergency Medical Services (EMS) & CivicRoute Telemetry",
                status=EvidenceStatus.VERIFIED.value,
                submitted_by=civicroute_user.id if civicroute_user else None,
                submitted_at=datetime(2026, 8, 27, 16, 30, tzinfo=timezone.utc),
            )
            db.add(e2)

            # Measurements for KPI 3
            m3 = KPIMeasurement(
                kpi_id=k3.id,
                pilot_id=p2.id,
                measured_value=88.2,
                measurement_date=date(2026, 8, 25),
                reporting_period_start=date(2026, 8, 1),
                reporting_period_end=date(2026, 8, 25),
                measured_by=civicroute_user.id if civicroute_user else None,
                measurement_method="Online and on-ground randomized survey of 1,200 regular corridor commuters.",
                data_sources_used="Digital survey platform with OTP verification",
                sample_size=1200,
                calculation_notes="88.2% positive ratings ('significantly faster commute' or 'moderately improved').",
                status=MeasurementStatus.VERIFIED.value,
            )
            db.add(m3)
            db.flush()

            # Evidence for KPI 3
            e3 = KPIEvidence(
                kpi_id=k3.id,
                measurement_id=m3.id,
                pilot_id=p2.id,
                title="Commuter Satisfaction Field Survey Results Report",
                description="Survey methodology, demographic breakdown, and raw response charts for 1,200 commuters.",
                evidence_type=EvidenceType.SURVEY_REPORT.value,
                file_name="commuter_satisfaction_survey_report.pdf",
                storage_key="seed_evidence_commuter_survey.pdf",
                mime_type="application/pdf",
                file_size=4120000,
                version=1,
                source="Independent Field Polling Agency",
                status=EvidenceStatus.VERIFIED.value,
                submitted_by=civicroute_user.id if civicroute_user else None,
                submitted_at=datetime(2026, 8, 25, 12, 0, tzinfo=timezone.utc),
            )
            db.add(e3)

            # Assign Validator (Dr. Sunita Patel from STQC)
            vp_stqc = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == val_user1.id).first() if val_user1 else None
            if vp_stqc:
                va = ValidationAssignment(
                    pilot_id=p2.id,
                    validator_id=vp_stqc.id,
                    assigned_by=gov_user.id if gov_user else None,
                    assigned_at=datetime(2026, 8, 30, 9, 0, tzinfo=timezone.utc),
                    scope="Independent audit of traffic delay reduction telemetry, emergency preemption response latency, and civic data integrity under GFR 2017.",
                    terms_of_reference="Verify raw sensor feeds, check for algorithmic data truncation, audit physical junction operations, and deliver outcome assessment.",
                    status=AssignmentStatus.COMPLETED.value,
                    coi_declared=True,
                    coi_status=ValidatorCOIDeclaration.NO_CONFLICT.value,
                    coi_declaration_date=datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc),
                    coi_details="Validator confirms zero commercial, equity, or personal connection to CivicRoute Solutions or municipal vendors.",
                    response_date=datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc),
                    deadline=date(2026, 9, 10),
                )
                db.add(va)
                db.flush()

                # COI record
                v_coi = ValidatorConflictOfInterest(
                    assignment_id=va.id,
                    validator_id=vp_stqc.id,
                    pilot_id=p2.id,
                    declaration=ValidatorCOIDeclaration.NO_CONFLICT.value,
                    has_financial_interest=False,
                    has_past_employment=False,
                    has_personal_relationship=False,
                    has_competitive_interest=False,
                    declaration_details="Full statutory compliance under GFR Rule 175. No conflicts detected.",
                    is_cleared=True,
                    cleared_by=gov_user.id if gov_user else None,
                    cleared_at=datetime(2026, 8, 30, 10, 15, tzinfo=timezone.utc),
                    declared_at=datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc),
                )
                db.add(v_coi)

                # Validation Report
                vr = ValidationReport(
                    pilot_id=p2.id,
                    validator_id=vp_stqc.id,
                    assignment_id=va.id,
                    executive_summary="The 60-day sandbox pilot conducted by CivicRoute Solutions successfully satisfied all empirical performance criteria. The adaptive signal control system yielded a 27.8% reduction in peak-hour vehicular delays across the 6 synchronized corridor junctions, exceeding the 25% target. Emergency vehicle green preemption averaged 38.4 seconds (well within the 45-second mandate). Commuter satisfaction attained 88.2%. The solution demonstrates operational readiness for large-scale municipal deployment.",
                    methodology="Independent physical site inspection across 6 junctions; cryptographic hash verification of raw loop detector CSV telemetry; 10 simulated emergency vehicle transit trials using calibrated GPS loggers; statistical review of 1,200 commuter survey responses.",
                    overall_assessment=ValidationAssessment.SUCCESSFUL.value,
                    overall_achievement_percentage=108.5,
                    kpis_achieved_count=3,
                    kpis_total_count=3,
                    confidence_level=ValidationConfidence.HIGH.value,
                    findings="1. CorriPulse Edge AI controllers operated with 99.7% network uptime over the 60-day trial.\n2. Delay reduction is statistically significant (p < 0.001) across all morning and evening peak windows.\n3. Preemption logic exhibited zero false-positive priority grants.\n4. Sensor calibration drift remained below 0.8% over the entire trial duration.",
                    unintended_effects="Minor queuing spillback observed on secondary cross-streets during extreme torrential rain on July 23, 2026. Startup promptly recalibrated minimum side-street green times to rectify.",
                    recommendations="1. Grant Pilot Success Certification.\n2. Proceed to GeM Direct Purchase scale-up under GFR Rule 149(viii) for municipal traffic corridors.\n3. Mandate redundant LTE + Optical fiber backhaul for city-wide expansion.",
                    readiness_assessment="Technology Readiness Level (TRL) 8 - System complete and qualified through test and demonstration in operational government environment.",
                    risks_and_limitations="Requires continuous municipal camera maintenance and lens cleaning protocol during monsoon seasons.",
                    status="SUBMITTED",
                    submitted_at=datetime(2026, 8, 31, 16, 0, tzinfo=timezone.utc),
                )
                db.add(vr)
                db.flush()

                # KPI Validation Line Items
                kv1 = KPIValidation(
                    report_id=vr.id,
                    kpi_id=k1.id,
                    validator_measured_value=27.8,
                    result=KPIValidationResult.ACHIEVED.value,
                    achievement_percentage=111.2,
                    evidence_sufficiency="SUFFICIENT",
                    confidence_score=0.98,
                    methodology_notes="Raw CSV data verified against municipal SCADA timestamps.",
                    validator_commentary="Target of 25.0% was exceeded by 2.8 percentage points. Significant congestion relief confirmed.",
                    divergence_analysis="Startup telemetry matches independent validator field telemetry perfectly.",
                )
                kv2 = KPIValidation(
                    report_id=vr.id,
                    kpi_id=k2.id,
                    validator_measured_value=38.4,
                    result=KPIValidationResult.ACHIEVED.value,
                    achievement_percentage=108.8,
                    evidence_sufficiency="SUFFICIENT",
                    confidence_score=0.95,
                    methodology_notes="Audited 10 live test runs with city ambulance service.",
                    validator_commentary="Emergency preemption averaged 38.4s, beating the 45s target consistently.",
                    divergence_analysis="No divergence detected.",
                )
                kv3 = KPIValidation(
                    report_id=vr.id,
                    kpi_id=k3.id,
                    validator_measured_value=88.2,
                    result=KPIValidationResult.ACHIEVED.value,
                    achievement_percentage=103.8,
                    evidence_sufficiency="SUFFICIENT",
                    confidence_score=0.92,
                    methodology_notes="Cross-checked phone numbers and OTP logs of 1,200 survey respondents.",
                    validator_commentary="Commuter satisfaction was 88.2%, surpassing 85.0% threshold.",
                    divergence_analysis="No divergence detected.",
                )
                db.add_all([kv1, kv2, kv3])

                # Update Pilot 2 validation status
                p2.validation_status = PilotValidationStatus.VALIDATION_SUBMITTED.value
                p2.validator_assessment = ValidationAssessment.SUCCESSFUL.value
                db.commit()
                logger.info("Seeded Step 7 KPIs, Measurements, Evidence & Submitted Validation Report for PILOT-2026-0002")

    # Seed KPIs on Pilot 1 (PILOT-2026-0001) for interactive testing
    p1 = db.query(Pilot).filter(Pilot.pilot_code == "PILOT-2026-0001").first()
    if p1:
        existing_p1_kpis = db.query(PilotKPI).filter(PilotKPI.pilot_id == p1.id).count()
        if existing_p1_kpis == 0:
            k_p1 = PilotKPI(
                pilot_id=p1.id,
                name="AI Traffic Junction Peak Queue Reduction",
                description="Target reduction in vehicle queue length at the AI-controlled pilot junction during rush hours.",
                category=KPICategory.IMPACT.value,
                measurement_type=KPIMeasurementType.PERCENTAGE.value,
                unit="%",
                baseline_value=0.0,
                baseline_date=date(2026, 4, 1),
                target_value=30.0,
                target_date=date(2026, 7, 31),
                target_operator=TargetOperator.GREATER_THAN_OR_EQUAL.value,
                direction=KPIDirection.HIGHER_IS_BETTER.value,
                weight=2.0,
                status=KPIStatus.ACTIVE.value,
                verification_method="Camera feed AI vehicle count validation.",
                data_source="Municipal CCTV Edge Nodes",
                created_by=gov_user.id if gov_user else None,
            )
            db.add(k_p1)
            db.flush()

            m_p1 = KPIMeasurement(
                kpi_id=k_p1.id,
                pilot_id=p1.id,
                measured_value=22.5,
                measurement_date=date(2026, 6, 15),
                reporting_period_start=date(2026, 5, 1),
                reporting_period_end=date(2026, 6, 15),
                measured_by=startup_user.id if startup_user else None,
                measurement_method="Initial 30-day queue monitoring analysis.",
                sample_size=450000,
                status=MeasurementStatus.SUBMITTED.value,
            )
            db.add(m_p1)
            db.flush()

            e_p1 = KPIEvidence(
                kpi_id=k_p1.id,
                measurement_id=m_p1.id,
                pilot_id=p1.id,
                title="Interim Queue Telemetry Snapshot",
                description="Mid-term queue length reduction dataset.",
                evidence_type=EvidenceType.DATASET.value,
                file_name="interim_queue_metrics.csv",
                storage_key="seed_evidence_interim_queue.csv",
                mime_type="text/csv",
                file_size=2450000,
                version=1,
                status=EvidenceStatus.UPLOADED.value,
                submitted_by=startup_user.id if startup_user else None,
                submitted_at=datetime(2026, 6, 15, 10, 0, tzinfo=timezone.utc),
            )
            db.add(e_p1)
            p1.validation_status = PilotValidationStatus.VALIDATION_IN_PROGRESS.value
            db.commit()
            logger.info("Seeded Step 7 active KPIs & measurement for interactive Pilot PILOT-2026-0001")

    # -------------------------------------------------------------------------
    # STEP 8: PROCUREMENT PATHWAYS, DECISION, CONTRACT, AND PAYMENT SEEDING
    # -------------------------------------------------------------------------
    logger.info("Seeding Step 8 Procurement Pathways, Decisions, Contracts & Payments...")

    pathways_data = [
        {
            "code": "DIRECT_GEM_L1",
            "name": "GeM Direct Purchase (Under Threshold)",
            "description": "Direct purchase permitted on GeM up to statutory ceiling of ₹5,00,000 for DPIIT-recognized startups under GFR Rule 149 (i).",
            "authority_level": "HEAD_OF_DEPARTMENT",
            "requires_competitive_process": False,
            "requires_financial_approval": True,
            "requires_legal_review": False,
        },
        {
            "code": "L1_BIDDING_GEM",
            "name": "GeM L1 Bidding (Limited Tender)",
            "description": "Comparison of at least 3 distinct OEM products meeting specifications on GeM under GFR Rule 149 (ii).",
            "authority_level": "JOINT_SECRETARY",
            "requires_competitive_process": True,
            "requires_financial_approval": True,
            "requires_legal_review": True,
        },
        {
            "code": "CUSTOM_BID_GEM",
            "name": "GeM Custom Bid / BOQ (High Value)",
            "description": "Electronic reverse auction / custom bid on GeM for complex, high-value deployment under GFR Rule 149 (iii).",
            "authority_level": "SECRETARY_MINISTRY",
            "requires_competitive_process": True,
            "requires_financial_approval": True,
            "requires_legal_review": True,
        },
        {
            "code": "PAC_DIRECT",
            "name": "Proprietary Article Certificate (PAC) Direct Award",
            "description": "Single source procurement under GFR 166 requiring technical justification and PAC certificate.",
            "authority_level": "SECRETARY_MINISTRY",
            "requires_competitive_process": False,
            "requires_financial_approval": True,
            "requires_legal_review": True,
        },
        {
            "code": "SWISS_CHALLENGE",
            "name": "Swiss Challenge Unsolicited Innovation Proposal",
            "description": "Unsolicited innovative solution subject to public counter-proposals with right of first refusal under GFR Rule 194.",
            "authority_level": "CABINET_COMMITTEE",
            "requires_competitive_process": True,
            "requires_financial_approval": True,
            "requires_legal_review": True,
        },
    ]

    pathway_map = {}
    for p_def in pathways_data:
        existing_p = db.query(ProcurementPathway).filter(ProcurementPathway.code == p_def["code"]).first()
        if not existing_p:
            p_obj = ProcurementPathway(
                code=p_def["code"],
                name=p_def["name"],
                description=p_def["description"],
                authority_level=p_def["authority_level"],
                requires_competitive_process=p_def["requires_competitive_process"],
                requires_financial_approval=p_def["requires_financial_approval"],
                requires_legal_review=p_def["requires_legal_review"],
                active=True,
            )
            db.add(p_obj)
            db.flush()
            pathway_map[p_def["code"]] = p_obj
        else:
            pathway_map[p_def["code"]] = existing_p

    # Query key users
    gov_user = db.query(User).filter(User.role == UserRole.GOVERNMENT).first()
    startup_user = db.query(User).filter(User.role == UserRole.STARTUP).first()
    proc_user = db.query(User).filter(User.role == UserRole.PROCUREMENT_OFFICER).first()

    # Seed an exemplary end-to-end procurement order for a completed validated pilot
    validated_pilot = db.query(Pilot).filter(
        or_(
            Pilot.success_status.in_([PilotSuccessStatus.SUCCESSFUL.value, PilotSuccessStatus.SUCCESSFUL]),
            Pilot.validator_assessment == "SUCCESSFUL",
            Pilot.pilot_code == "PILOT-2026-0002",
        )
    ).first()

    if validated_pilot:
        validated_pilot.success_status = PilotSuccessStatus.SUCCESSFUL.value
        db.flush()

    if validated_pilot and gov_user and startup_user:
        existing_dec = db.query(ProcurementDecision).filter(ProcurementDecision.pilot_id == validated_pilot.id).first()
        if not existing_dec:
            # 1. Procurement Decision
            dec = ProcurementDecision(
                procurement_code="PDEC-2026-0001",
                pilot_id=validated_pilot.id,
                application_id=validated_pilot.application_id,
                challenge_id=validated_pilot.challenge_id,
                startup_id=validated_pilot.startup_id,
                government_department_id=validated_pilot.challenge.department_id if validated_pilot.challenge else gov_user.department_id,
                decision_type="PROCEED_TO_PROCUREMENT",
                decision_status="APPROVED",
                rationale="100% KPI pass rate confirmed by STQC independent audit. Validated edge AI computer vision solution meets smart city operational criteria.",
                outcome_summary="Empirical field accuracy exceeding 96.2% on traffic congestion telemetry.",
                estimated_value=450000.0,
                currency="INR",
                quantity=1,
                intended_scope="Phase 1 City-wide roll-out across 15 key intersections.",
                created_by=gov_user.id,
                reviewed_by=proc_user.id if proc_user else gov_user.id,
                decided_at=datetime(2026, 4, 1, 10, 0, tzinfo=timezone.utc),
            )
            db.add(dec)
            db.flush()

            # 2. Procurement Record
            pw = pathway_map.get("DIRECT_GEM_L1")
            rec = ProcurementRecord(
                procurement_code="PROC-2026-0001",
                procurement_decision_id=dec.id,
                pilot_id=validated_pilot.id,
                startup_id=validated_pilot.startup_id,
                government_department_id=dec.government_department_id,
                pathway_id=pw.id if pw else None,
                title="AI Edge Traffic Sensor Integration & Analytics Deployment",
                description="Procurement order following successful sandbox pilot validation.",
                scope="15 edge computer vision camera gateways and central telemetry ingestion.",
                estimated_value=450000.0,
                approved_value=450000.0,
                currency="INR",
                quantity=1,
                start_date=date(2026, 4, 15),
                planned_end_date=date(2026, 10, 15),
                status="APPROVED",
                approval_status="APPROVED",
                acknowledgement_confirmed=True,
                created_by=gov_user.id,
            )
            db.add(rec)
            db.flush()

            # 3. Approvals
            appr1 = ProcurementApproval(
                procurement_id=rec.id,
                approval_type="GOVERNMENT_REVIEW",
                approver_id=gov_user.id,
                status="APPROVED",
                comments="Budget sanctioned under Smart Cities Urban Mission FY 2026-27.",
                approved_at=datetime(2026, 4, 2, 11, 0, tzinfo=timezone.utc),
            )
            appr2 = ProcurementApproval(
                procurement_id=rec.id,
                approval_type="PROCUREMENT_APPROVAL",
                approver_id=proc_user.id if proc_user else gov_user.id,
                status="APPROVED",
                comments="GeM direct purchase sanction accorded under GFR Rule 149 (i).",
                approved_at=datetime(2026, 4, 3, 14, 30, tzinfo=timezone.utc),
            )
            db.add_all([appr1, appr2])
            db.flush()

            # 4. Executed Contract
            contract = Contract(
                contract_code="CONTRACT-2026-0001",
                procurement_id=rec.id,
                startup_id=validated_pilot.startup_id,
                government_department_id=rec.government_department_id,
                title="AI Edge Traffic Sensor Integration & Analytics Deployment",
                contract_type="SERVICE",
                contract_value=450000.0,
                currency="INR",
                start_date=date(2026, 4, 15),
                end_date=date(2026, 10, 15),
                description="Commercial contract executed post pilot validation",
                scope="15 edge nodes and central command analytics telemetry",
                terms_summary="Milestone-Linked Decoupled Tranches per GFR 2017 standards",
                status="ACTIVE",
                created_by=gov_user.id,
                executed_at=datetime(2026, 4, 15, 10, 0, tzinfo=timezone.utc),
            )
            db.add(contract)
            db.flush()

            # 5. Contract Milestones
            m1 = ContractMilestone(
                contract_id=contract.id,
                milestone_code="MS-0001",
                title="Milestone 1: Edge Hardware Setup & API Gateway Provisioning",
                description="Deployment of 15 edge computer vision camera gateways across central junctions.",
                sequence_number=1,
                due_date=date(2026, 5, 20),
                amount=180000.0,
                percentage=40.0,
                status="ACCEPTED",
                acceptance_status="ACCEPTED",
                deliverable_requirements="15 edge units deployed, operational with 99.8% uptime.",
                completed_at=datetime(2026, 5, 25, 15, 0, tzinfo=timezone.utc),
            )
            m2 = ContractMilestone(
                contract_id=contract.id,
                milestone_code="MS-0002",
                title="Milestone 2: Real-time Telemetry Dashboard & System Acceptance",
                description="Live telemetry stream integration into Central Urban Command Center.",
                sequence_number=2,
                due_date=date(2026, 8, 20),
                amount=270000.0,
                percentage=60.0,
                status="SUBMITTED",
                acceptance_status="PENDING",
                deliverable_requirements="Command center dashboard live with automated congestion alerts.",
            )
            db.add_all([m1, m2])
            db.flush()

            # 6. Payment Tranches (Decoupled)
            t1 = PaymentTranche(
                contract_id=contract.id,
                milestone_id=m1.id,
                tranche_code="TRN-2026-0001",
                description="Tranche 1 - 40% on Edge Hardware Deployment",
                amount=180000.0,
                percentage=40.0,
                currency="INR",
                due_date=date(2026, 5, 20),
                status="PAID",
            )
            t2 = PaymentTranche(
                contract_id=contract.id,
                milestone_id=m2.id,
                tranche_code="TRN-2026-0002",
                description="Tranche 2 - 60% on Dashboard Acceptance",
                amount=270000.0,
                percentage=60.0,
                currency="INR",
                due_date=date(2026, 8, 20),
                status="SCHEDULED",
            )
            db.add_all([t1, t2])
            db.flush()

            # 7. Disbursed Invoice for Tranche 1
            inv1 = Invoice(
                invoice_number="INV-2026-0001",
                contract_id=contract.id,
                milestone_id=m1.id,
                payment_tranche_id=t1.id,
                startup_id=contract.startup_id,
                amount=180000.0,
                tax_amount=32400.0,
                total_amount=212400.0,
                currency="INR",
                invoice_date=date(2026, 5, 26),
                due_date=date(2026, 6, 26),
                description="GSTIN: 07AAAAA0000A1Z5. Bank: SBI Current A/C 39182746192, IFSC: SBIN0001234",
                invoice_file="https://govinnovate.in/invoices/inv_2026_0001.pdf",
                status="PAID",
                submitted_at=datetime(2026, 5, 26, 11, 0, tzinfo=timezone.utc),
                reviewed_at=datetime(2026, 5, 28, 16, 0, tzinfo=timezone.utc),
                approved_at=datetime(2026, 5, 28, 16, 0, tzinfo=timezone.utc),
                review_comments="GSTIN and HSN code 998314 verified. Cleared for PFMS transfer.",
            )
            db.add(inv1)
            db.commit()
            logger.info("Successfully seeded Step 8 exemplary procurement order CONTRACT-2026-0001 and tranches.")

        # ----------------------------------------------------------------------
        # Step 9: Scale-Up, Replication & Impact Management Seeding
        # ----------------------------------------------------------------------
        existing_scale_dec = db.query(ScaleUpDecision).filter(ScaleUpDecision.scale_up_code == "SCALE-2026-0001").first()
        if not existing_scale_dec:
            logger.info("Seeding Step 9 Scale-Up, Replication and Impact demo data...")
            gov_user = db.query(User).filter(User.email == "government@govinnovate.gov.in").first()
            startup_user = db.query(User).filter(User.email == "startup@innovatetech.io").first()

            pilot = db.query(Pilot).filter(
                or_(
                    Pilot.pilot_code == "PILOT-2026-0002",
                    Pilot.pilot_title.ilike("%Traffic%"),
                )
            ).first()

            if pilot and gov_user and startup_user:
                app = pilot.application
                ch = app.challenge if app else None
                st = app.startup if app else None
                dept_id = ch.department_id if ch else (gov_user.department_id or "dept-meity")
                st_id = st.id if st else (startup_user.startup_id or "startup-innovatetech")
                contract = db.query(Contract).filter(Contract.startup_id == st_id).first()
                proc = db.query(ProcurementRecord).filter(ProcurementRecord.pilot_id == pilot.id).first()

                # 1. ScaleUpDecision
                decision = ScaleUpDecision(
                    scale_up_code="SCALE-2026-0001",
                    pilot_id=pilot.id,
                    procurement_id=proc.id if proc else None,
                    contract_id=contract.id if contract else None,
                    startup_id=st_id,
                    originating_department_id=dept_id,
                    decision_type=ScaleUpDecisionType.SCALE.value,
                    decision_status=ScaleUpDecisionStatus.APPROVED.value,
                    rationale="DEMO / DEVELOPMENT DATA: Following STQC validation and 32% congestion reduction in pilot sandbox, scaling deployment to 12 major intersections across Delhi NCR.",
                    expected_impact="Targeting 25% peak-hour commute delay reduction, 30% emergency vehicle transit acceleration, and 120 tonnes annual carbon emission reduction.",
                    estimated_scale_value=1200000.0,
                    currency="INR",
                    proposed_sites_count=12,
                    proposed_regions="Delhi NCR - Central, South & Eastern Traffic Corridors",
                    proposed_start_date=date(2026, 9, 1),
                    proposed_end_date=date(2027, 3, 31),
                    created_by=gov_user.id,
                    reviewed_by=gov_user.id,
                    decided_at=datetime(2026, 8, 25, 10, 0, tzinfo=timezone.utc),
                )
                db.add(decision)
                db.flush()

                # 2. ScaleUpPlan
                plan = ScaleUpPlan(
                    scale_up_decision_id=decision.id,
                    plan_code="PLAN-2026-0001",
                    title="DEMO / DEVELOPMENT DATA: NCR Intelligent Traffic Grid Expansion - Phase 1",
                    objective="Deploy AI computer vision edge sensor nodes across 12 high-density arterial intersections to synchronize multi-nodal corridor signal cycles.",
                    scope="12 major intersections across Delhi NCR, integrating with Delhi Traffic Police Central Command Center.",
                    target_population="Estimated 2.4 million daily peak commuters across NCR",
                    deployment_strategy=RolloutStrategy.PHASED_ROLLOUT.value,
                    rollout_strategy=RolloutStrategy.PHASED_ROLLOUT.value,
                    estimated_budget=1200000.0,
                    approved_budget=1200000.0,
                    currency="INR",
                    target_sites=12,
                    target_units=48,
                    target_regions="Delhi NCR",
                    start_date=date(2026, 9, 1),
                    planned_end_date=date(2027, 3, 31),
                    status=ScalePlanStatus.ACTIVE.value,
                    approval_status=ScalePlanApprovalStatus.APPROVED.value,
                    created_by=gov_user.id,
                )
                db.add(plan)
                db.flush()

                # 3. Rollout Phases
                ph1 = ScalePhase(
                    scale_up_plan_id=plan.id,
                    phase_number=1,
                    title="Phase 1: Outer Ring Road & Dhaula Kuan Arterial Corridor",
                    objective="Install 16 AI sensor nodes across 4 high-speed interchange nodes.",
                    target_count=4,
                    budget=400000.0,
                    start_date=date(2026, 9, 1),
                    end_date=date(2026, 10, 31),
                    status=ScalePhaseStatus.COMPLETED.value,
                    completion_percentage=100.0,
                )
                ph2 = ScalePhase(
                    scale_up_plan_id=plan.id,
                    phase_number=2,
                    title="Phase 2: Central Delhi & ITO Grid Integration",
                    objective="Integrate 16 edge sensors across ITO and Vikas Marg corridors.",
                    target_count=4,
                    budget=400000.0,
                    start_date=date(2026, 11, 1),
                    end_date=date(2026, 12, 31),
                    status=ScalePhaseStatus.ACTIVE.value,
                    completion_percentage=65.0,
                )
                ph3 = ScalePhase(
                    scale_up_plan_id=plan.id,
                    phase_number=3,
                    title="Phase 3: South Transit & AIIMS Hospital Green Corridor",
                    objective="Deploy dynamic ambulance priority corridor across 4 transit nodes.",
                    target_count=4,
                    budget=400000.0,
                    start_date=date(2027, 1, 1),
                    end_date=date(2027, 3, 31),
                    status=ScalePhaseStatus.PLANNED.value,
                    completion_percentage=0.0,
                )
                db.add_all([ph1, ph2, ph3])
                db.flush()

                # 4. Scale Targets (Sites)
                t1 = ScaleTarget(
                    scale_up_plan_id=plan.id,
                    name="Dhaula Kuan Flyover Interchange",
                    target_type=ScaleTargetType.SITE.value,
                    department_id=dept_id,
                    region="South West Delhi",
                    district="New Delhi",
                    site_name="Dhaula Kuan Central Junction",
                    operational_unit="Unit-DK-01",
                    target_population=450000,
                    planned_start_date=date(2026, 9, 1),
                    planned_end_date=date(2026, 9, 30),
                    budget=100000.0,
                    status=ScaleTargetStatus.COMPLETED.value,
                    progress_percentage=100.0,
                )
                t2 = ScaleTarget(
                    scale_up_plan_id=plan.id,
                    name="Moti Bagh Arterial Node",
                    target_type=ScaleTargetType.SITE.value,
                    department_id=dept_id,
                    region="South Delhi",
                    district="New Delhi",
                    site_name="Ring Road Junction 4",
                    operational_unit="Unit-MB-02",
                    target_population=380000,
                    planned_start_date=date(2026, 9, 15),
                    planned_end_date=date(2026, 10, 15),
                    budget=100000.0,
                    status=ScaleTargetStatus.COMPLETED.value,
                    progress_percentage=100.0,
                )
                t3 = ScaleTarget(
                    scale_up_plan_id=plan.id,
                    name="ITO Central Junction",
                    target_type=ScaleTargetType.SITE.value,
                    department_id=dept_id,
                    region="Central Delhi",
                    district="Central Delhi",
                    site_name="ITO Intersection 1",
                    operational_unit="Unit-ITO-03",
                    target_population=600000,
                    planned_start_date=date(2026, 11, 1),
                    planned_end_date=date(2026, 11, 30),
                    budget=100000.0,
                    status=ScaleTargetStatus.ACTIVE.value,
                    progress_percentage=70.0,
                )
                t4 = ScaleTarget(
                    scale_up_plan_id=plan.id,
                    name="Vikas Marg Transit Gateway",
                    target_type=ScaleTargetType.SITE.value,
                    department_id=dept_id,
                    region="East Delhi",
                    district="East Delhi",
                    site_name="Laxmi Nagar Hub",
                    operational_unit="Unit-VM-04",
                    target_population=520000,
                    planned_start_date=date(2026, 11, 15),
                    planned_end_date=date(2026, 12, 15),
                    budget=100000.0,
                    status=ScaleTargetStatus.ACTIVE.value,
                    progress_percentage=60.0,
                )
                db.add_all([t1, t2, t3, t4])
                db.flush()

                # 5. Readiness Checks (9 Standard Categories)
                readiness_items = [
                    (ReadinessCategory.TECHNICAL, "Technical Scalability & Architecture Verification", True, ReadinessStatus.COMPLETED, "Architecture verified for 48 edge nodes with sub-200ms latency."),
                    (ReadinessCategory.OPERATIONAL, "Site Operations & Deployment Protocol", True, ReadinessStatus.COMPLETED, "Deployment protocol concurred by joint traffic task force."),
                    (ReadinessCategory.SECURITY, "Data Privacy & STQC/Cyber Security Compliance", True, ReadinessStatus.COMPLETED, "STQC certificate STQC-CERT-2026-001 active; zero edge telemetry leak."),
                    (ReadinessCategory.FINANCIAL, "Budget Concurrence & Departmental Fund Allocation", True, ReadinessStatus.COMPLETED, "Treasury sanction order issued for INR 12.00 Lakhs."),
                    (ReadinessCategory.TRAINING, "Field Staff & End-User Training Curriculum", False, ReadinessStatus.COMPLETED, "18 traffic control officers trained on dynamic override dashboard."),
                    (ReadinessCategory.SUPPORT, "Service Level Agreement (SLA) & Maintenance Protocol", True, ReadinessStatus.COMPLETED, "99.8% SLA and 4-hour MTTR hardware replacement agreement executed."),
                    (ReadinessCategory.DATA, "Data Pipeline & Telemetry Verification", False, ReadinessStatus.COMPLETED, "Real-time telemetry ingestion active at 30-sec polling interval."),
                    (ReadinessCategory.INFRASTRUCTURE, "Site Facilities, Power & Connectivity Readiness", True, ReadinessStatus.COMPLETED, "Solar dual-power backups and optical line connections completed at all 4 sites."),
                    (ReadinessCategory.GOVERNANCE, "Inter-Agency MoUs & Stakeholder Authorizations", True, ReadinessStatus.COMPLETED, "MoU between MoRTH, Delhi Traffic Police and Startup fully executed."),
                ]
                for cat, name, req, stat, comments in readiness_items:
                    rc = ScaleReadinessCheck(
                        scale_up_plan_id=plan.id,
                        category=cat.value,
                        check_name=name,
                        required=req,
                        status=stat.value,
                        reviewer_id=gov_user.id,
                        reviewer_comments=comments,
                        completed_at=datetime(2026, 8, 28, 14, 0, tzinfo=timezone.utc),
                    )
                    db.add(rc)
                db.flush()

                # 6. Replications
                rep = Replication(
                    scale_up_plan_id=plan.id,
                    source_pilot_id=pilot.id,
                    source_site="Delhi NCR",
                    target_site="Bengaluru Outer Ring Road Corridor",
                    target_department_id=dept_id,
                    adaptation_required=True,
                    adaptation_notes="DEMO / DEVELOPMENT DATA: Re-calibrating density thresholds for heavy two-wheeler cluster dynamics in Bengaluru.",
                    local_constraints="Monsoon drainage considerations for roadside junction boxes.",
                    deployment_status=ReplicationDeploymentStatus.PLANNED.value,
                )
                db.add(rep)
                db.flush()

                # 7. Deployment Updates
                up1 = ScaleDeploymentUpdate(
                    scale_target_id=t1.id,
                    status="COMPLETED",
                    completion_percentage=100.0,
                    update_text="Edge cameras and sensor enclosures mounted, calibrated and verified with Central Traffic HQ.",
                    submitted_by=startup_user.id,
                    submitted_at=datetime(2026, 9, 28, 15, 0, tzinfo=timezone.utc),
                    reviewed_by=gov_user.id,
                    reviewed_at=datetime(2026, 9, 29, 10, 0, tzinfo=timezone.utc),
                    review_comments="Site inspected and verified by Divisional Traffic Inspector.",
                )
                up2 = ScaleDeploymentUpdate(
                    scale_target_id=t3.id,
                    status="ACTIVE",
                    completion_percentage=70.0,
                    update_text="Optical cabling laid across 3 arms of the ITO intersection. Phase 2 synchronization live.",
                    submitted_by=startup_user.id,
                    submitted_at=datetime(2026, 11, 20, 16, 0, tzinfo=timezone.utc),
                )
                db.add_all([up1, up2])
                db.flush()

                # 8. Impact Metrics
                m1 = ImpactMetric(
                    scale_up_plan_id=plan.id,
                    code="IMP-TRAF-01",
                    title="Peak-Hour Wait Time Reduction",
                    category=ImpactCategory.SERVICE_DELIVERY.value,
                    unit="%",
                    baseline_value=0.0,
                    target_value=25.0,
                    actual_value=28.5,
                    direction=ImpactDirection.HIGHER_IS_BETTER.value,
                    weight=3.0,
                    is_critical=True,
                    measurement_date=date(2026, 11, 25),
                    data_source="Delhi Police SCATS Telemetry Stream",
                    verification_status="VERIFIED",
                )
                m2 = ImpactMetric(
                    scale_up_plan_id=plan.id,
                    code="IMP-FUEL-02",
                    title="Idling Carbon Emission Abatement",
                    category=ImpactCategory.ENVIRONMENT.value,
                    unit="Tonnes CO2/Month",
                    baseline_value=120.0,
                    target_value=85.0,
                    actual_value=81.2,
                    direction=ImpactDirection.LOWER_IS_BETTER.value,
                    weight=2.0,
                    is_critical=False,
                    measurement_date=date(2026, 11, 25),
                    data_source="CPCB Air Quality Environmental Station #4",
                    verification_status="VERIFIED",
                )
                m3 = ImpactMetric(
                    scale_up_plan_id=plan.id,
                    code="IMP-EMERG-03",
                    title="Emergency Ambulance Transit Clearance Time",
                    category=ImpactCategory.SOCIAL_IMPACT.value,
                    unit="Minutes",
                    baseline_value=18.0,
                    target_value=9.0,
                    actual_value=7.4,
                    direction=ImpactDirection.LOWER_IS_BETTER.value,
                    weight=2.5,
                    is_critical=True,
                    measurement_date=date(2026, 11, 25),
                    data_source="CATS Ambulance GPS Corridor Logs",
                    verification_status="VERIFIED",
                )
                db.add_all([m1, m2, m3])
                db.flush()

                # 9. Impact Measurements & Evidence
                meas1 = ImpactMeasurement(
                    impact_metric_id=m1.id,
                    value=28.5,
                    measurement_date=date(2026, 11, 25),
                    sample_size=240000,
                    confidence_interval="99% (±0.4%)",
                    data_source="SCATS Telemetry",
                    recorded_by=gov_user.id,
                    notes="Measured across 4 active intersections over 14 consecutive working days.",
                )
                ev1 = ImpactEvidence(
                    impact_metric_id=m1.id,
                    title="IIT Delhi Transportation Center Telemetry Validation Report",
                    file_name="iitd_traffic_validation_nov2026.pdf",
                    storage_key="evidence/scale/imp_traf_01_nov2026.pdf",
                    checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    version=1,
                    verification_status="VERIFIED",
                    uploaded_by=gov_user.id,
                )
                db.add_all([meas1, ev1])
                db.flush()

                # 10. Scale Beneficiary Metrics
                ben1 = ScaleBeneficiaryMetric(
                    scale_up_plan_id=plan.id,
                    category=BeneficiaryCategory.DIRECT_BENEFICIARIES.value,
                    baseline_count=0,
                    target_count=2000000,
                    actual_count=1950000,
                    measurement_date=date(2026, 11, 25),
                    data_source="Metro and Traffic Commuter Toll Stream",
                    verification_status="VERIFIED",
                )
                ben2 = ScaleBeneficiaryMetric(
                    scale_up_plan_id=plan.id,
                    category=BeneficiaryCategory.CITIZENS.value,
                    baseline_count=0,
                    target_count=5000000,
                    actual_count=4850000,
                    measurement_date=date(2026, 11, 25),
                    data_source="Municipal Corporation Census Estimates",
                    verification_status="VERIFIED",
                )
                db.add_all([ben1, ben2])
                db.flush()

                # 11. Scale Outcome
                outcome = ScaleOutcome(
                    scale_up_plan_id=plan.id,
                    impact_score=94.5,
                    recommended_outcome=ScaleOutcomeType.SUCCESSFUL.value,
                    confirmed_outcome=ScaleOutcomeType.SUCCESSFUL.value,
                    confirmation_reason="All 3 critical impact thresholds exceeded with robust statistical confidence. Excellent inter-agency execution.",
                    confirmed_by=gov_user.id,
                    confirmed_at=datetime(2026, 11, 28, 17, 0, tzinfo=timezone.utc),
                )
                db.add(outcome)
                db.flush()

                # 12. Scale Risks & Lessons
                r1 = ScaleRisk(
                    scale_up_plan_id=plan.id,
                    title="Monsoon Camera Lens Fogging & Heavy Rain Occlusion",
                    description="High humidity and downpours can reduce optical frame clarity by up to 15%.",
                    category=RiskCategory.OPERATIONAL.value,
                    severity=RiskSeverity.MEDIUM.value,
                    likelihood="MEDIUM",
                    mitigation="Hydrophobic coated lens shields and supplemental infrared illuminators installed.",
                    owner="Startup Deployment Engineering Team",
                    status=RiskStatus.RESOLVED.value,
                )
                l1 = ScaleLesson(
                    scale_up_plan_id=plan.id,
                    title="Pre-rollout Inter-Agency Traffic Police Synchronization",
                    description="Engaging zonal ACPs and traffic inspectors during site selection prevented 3 weeks of jurisdictional permit delays.",
                    category=LessonCategory.OPERATIONAL.value,
                    recommendation="Establish institutional joint field task force at least 30 days prior to physical hardware mobilization.",
                    created_by=gov_user.id,
                )
                db.add_all([r1, l1])
                db.commit()
                logger.info("Successfully seeded Step 9 Scale-Up exemplary plan PLAN-2026-0001, targets, metrics and outcomes.")

    logger.info("Development seeding completed successfully.")

    logger.info("Development seeding completed successfully.")



def main():
    db = SessionLocal()
    try:
        # Ensure schema is created
        Base.metadata.create_all(bind=engine)
        seed_database(db)
    except Exception as e:
        logger.error(f"Error seeding database: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

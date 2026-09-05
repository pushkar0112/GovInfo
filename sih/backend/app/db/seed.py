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
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
import app.models  # Load models
from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.application import Application
from app.models.audit_log import AuditLog
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

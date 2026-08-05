//
//  APIModels.swift
//  Miran
//
//  Codable models matching the Miran Enterprise Backend API schema (v3.0).
//

import Foundation

// MARK: - Auth & User Requests & Responses
struct LoginRequest: Encodable {
    let email: String
    let password: String
    let mfaCode: String?
}

struct SwitchOrgRequest: Encodable {
    let organizationId: String
}

struct LaunchCallRequest: Encodable {
    let callType: String
    let customTitle: String?
    let note: String?
    let location: String?
    let expectedMinutes: Int
}

struct LoginResponse: Codable {
    let user: UserProfileResponse
    let tokens: TokenPair
}

struct TokenPair: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: String
}

struct UserProfileResponse: Codable, Identifiable {
    let id: String
    let personId: String
    let nameAr: String
    let nameEn: String?
    let email: String
    // ─── RBAC — الأدوار والصلاحيات القادمة من Backend ───────────
    let roles: [String]
    let permissions: [String]
    // ─────────────────────────────────────────────────────────────
    let activeOrganization: UserOrgResponse
    let availableOrganizations: [UserOrgResponse]

    // ── وصول سريع للأدوار ──────────────────────────────────────
    var isTrainee:           Bool { roles.contains("trainee") }
    var isTrainer:           Bool { roles.contains("trainer") }
    var isAcademicSupervisor: Bool { roles.contains("academic_supervisor") }
    var isOrgManager:        Bool { roles.contains("org_manager") }
    var isPlatformOwner:     Bool { roles.contains("platform_owner") }

    var canLaunchCalls:      Bool { roles.contains("trainer") || roles.contains("org_manager") }
    var canManageAccounts:   Bool { roles.contains("org_manager") || roles.contains("platform_owner") }
    var canViewActiveCalls:  Bool { roles.contains("trainer") || roles.contains("org_manager") }
    var canRespondToCalls:   Bool { roles.contains("trainee") }

    /// أعلى دور للمستخدم (لتحديد التبويبة الرئيسية)
    var primaryRole: String {
        if isPlatformOwner  { return "platform_owner" }
        if isOrgManager     { return "org_manager" }
        if isAcademicSupervisor { return "academic_supervisor" }
        if isTrainer        { return "trainer" }
        if isTrainee        { return "trainee" }
        return "unknown"
    }
}

struct UserOrgResponse: Codable, Identifiable, Hashable {
    let id: String
    let code: String
    let nameAr: String
    let nameEn: String?
    let isPrimary: Bool?
}

// MARK: - Person
struct PersonModel: Codable, Identifiable {
    let id: String
    let nationalId: String?
    let nameAr: String
    let nameEn: String?
    let email: String?
    let phone: String?
    let bloodType: String?
    let emergencyContactName: String?
    let emergencyContactPhone: String?
}

// MARK: - Organization
struct OrganizationModel: Codable, Identifiable {
    let id: String
    let code: String
    let nameAr: String
    let nameEn: String?
    let status: String
    let cityAr: String?
    let regionAr: String?
    let contactEmail: String?
    let contactPhone: String?
}

// MARK: - Trainee Profile
struct TraineeProfileModel: Codable, Identifiable {
    let id: String
    let personId: String
    let organizationId: String
    let traineeNumber: String
    let level: String
    let specialtyAr: String?
    let specialtyEn: String?
    let applicationStatus: String
    let cardStatus: String
    let cardUuid: String?
    let cardSignature: String?
    let accessStartDate: String?
    let accessEndDate: String?
    let photoApproved: Bool
    let person: PersonModel?
    let organization: OrganizationModel?
}

// MARK: - Trainer Profile
struct TrainerProfileModel: Codable, Identifiable {
    let id: String
    let personId: String
    let organizationId: String
    let departmentId: String?
    let titleAr: String?
    let extensionNumber: String?
    let maxTrainees: Int
    let specialization: String?
    let person: PersonModel?
}

// MARK: - Rotation
struct RotationModel: Codable, Identifiable {
    let id: String
    let organizationId: String
    let traineeProfileId: String
    let departmentId: String
    let trainerProfileId: String
    let startDate: String
    let endDate: String
    let status: String
    let midpointMeetingDone: Bool
    let department: DepartmentModel?
    let trainerProfile: TrainerProfileModel?
}

// MARK: - Department
struct DepartmentModel: Codable, Identifiable {
    let id: String
    let nameAr: String
    let nameEn: String?
    let code: String?
    let capacity: Int
    let roundLocation: String?
    let roundTime: String?
    let meetingRoom: String?
}

// MARK: - Attendance
struct AttendanceModel: Codable, Identifiable {
    let id: String
    let date: String
    let checkIn: String?
    let checkOut: String?
    let isLate: Bool
    let lateMinutes: Int?
    let status: String
    let excuseReason: String?
}

// MARK: - Call System
struct TrainerCallModel: Codable, Identifiable {
    let id: String
    let callType: String
    let customTitle: String?
    let note: String?
    let location: String?
    let expectedMinutes: Int?
    let launchedAt: String
    let endedAt: String?
    let status: String
    let participants: [CallParticipantModel]?
}

struct CallParticipantModel: Codable, Identifiable {
    let id: String
    let callId: String
    let traineeProfileId: String
    let state: String
    let notifiedAt: String
    let ackAt: String?
    let selfArrivedAt: String?
    let confirmedAt: String?
}

// MARK: - Evaluation
struct EvaluationModel: Codable, Identifiable {
    let id: String
    let evaluationType: String
    let totalScore: Double?
    let comments: String?
    let isSuspicious: Bool
    let submittedAt: String
}

// MARK: - Document
struct DocumentModel: Codable, Identifiable {
    let id: String
    let documentType: String
    let titleAr: String
    let storageKey: String
    let isMandatory: Bool
    let status: String
    let expiryDate: String?
}

// MARK: - Notification
struct NotificationModel: Codable, Identifiable {
    let id: String
    let titleAr: String
    let bodyAr: String?
    let type: String
    let isRead: Bool
    let createdAt: String
}

// MARK: - Clinical Logbook & Procedures & Competencies
struct ProcedureCatalogModel: Codable, Identifiable {
    let id: String
    let code: String
    let titleAr: String
    let titleEn: String
    let category: String
    let minRequired: Int
}

struct ClinicalCaseLogModel: Codable, Identifiable {
    let id: String
    let diagnosis: String
    let patientAge: Int?
    let patientGender: String?
    let specialtyAr: String?
    let complexity: String
    let participationLevel: String
    let status: String
    let notes: String?
    let performedAt: String
    let procedure: ProcedureCatalogModel?
    let department: DepartmentModel?
}

struct CompetencyProgressModel: Codable, Identifiable {
    let id: String
    let requiredCount: Int
    let completedCount: Int
    let status: String
    let procedure: ProcedureCatalogModel?
}

struct CompetencyPortfolioResponse: Codable {
    let overallPercentage: Int
    let totalRequired: Int
    let totalCompleted: Int
    let data: [CompetencyProgressModel]
}

// MARK: - Audit Log
struct AuditLogModel: Codable, Identifiable {
    let id: String
    let action: String
    let entityType: String
    let entityId: String?
    let userEmail: String?
    let userRole: String?
    let ipAddress: String?
    let timestamp: String
}

// MARK: - Organization Create & Update DTOs
struct CreateOrganizationRequest: Encodable {
    let code: String
    let nameAr: String
    let nameEn: String?
    let type: String
    let cityAr: String?
    let regionAr: String?
    let contactEmail: String?
    let contactPhone: String?
}

struct UpdateOrganizationRequest: Encodable {
    let nameAr: String?
    let nameEn: String?
    let status: String?
    let cityAr: String?
    let regionAr: String?
    let contactEmail: String?
    let contactPhone: String?
}

// MARK: - Department Create DTO
struct CreateDepartmentRequest: Encodable {
    let nameAr: String
    let nameEn: String?
    let code: String?
    let capacity: Int
    let roundLocation: String?
    let roundTime: String?
    let meetingRoom: String?
}

// MARK: - User Account Create DTO
struct CreateUserAccountRequest: Encodable {
    let nationalId: String
    let nameAr: String
    let email: String
    let phone: String
    let roleCode: String
    let organizationId: String
}

// MARK: - Clinical Case Create DTO
struct CreateClinicalCaseRequest: Encodable {
    let diagnosis: String
    let specialtyAr: String?
    let complexity: String
    let participationLevel: String
    let procedureId: String?
    let departmentId: String?
    let notes: String?
}

// MARK: - API Response Wrapper
struct APIListResponse<T: Codable>: Codable {
    let data: [T]
}


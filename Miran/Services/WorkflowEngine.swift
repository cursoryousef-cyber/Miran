//
//  WorkflowEngine.swift
//  Miran
//
//  Centralized Workflow & Approval State Machine Engine for Miran Health Platform.
//  Manages State Transitions, Approval Workflows, Timelines, and Legal/Cluster Sign-offs.
//

import Foundation
import SwiftUI

// MARK: - Generic Workflow States
enum WorkflowState: String, Codable, CaseIterable {
    case draft = "DRAFT"
    case pendingReview = "PENDING_REVIEW"
    case legalReview = "LEGAL_REVIEW"
    case clusterApproval = "CLUSTER_APPROVAL"
    case universityApproval = "UNIVERSITY_APPROVAL"
    case ministryApproval = "MINISTRY_APPROVAL"
    case approved = "APPROVED"
    case rejected = "REJECTED"
    case active = "ACTIVE"
    case suspended = "SUSPENDED"
    case closed = "CLOSED"

    var titleAr: String {
        switch self {
        case .draft: return "مسودة"
        case .pendingReview: return "قيد المراجعة"
        case .legalReview: return "مراجعة قانونية"
        case .clusterApproval: return "اعتماد التجمع"
        case .universityApproval: return "اعتماد الجامعة"
        case .ministryApproval: return "اعتماد الوزارة"
        case .approved: return "معتمد"
        case .rejected: return "مرفوض"
        case .active: return "سارية / نشط"
        case .suspended: return "معلق مؤقتاً"
        case .closed: return "مغلق / منتهي"
        }
    }

    var color: Color {
        switch self {
        case .draft: return .gray
        case .pendingReview, .legalReview: return .orange
        case .clusterApproval, .universityApproval, .ministryApproval: return .purple
        case .approved, .active: return MiranTheme.emerald
        case .rejected, .closed: return .red
        case .suspended: return .yellow
        }
    }
}

// MARK: - Workflow Event Record (Timeline Item)
struct WorkflowTimelineItem: Identifiable, Codable {
    let id: String
    let entityId: String
    let entityType: String // "AGREEMENT", "PROGRAM", "LOGBOOK", "INTAKE"
    let fromState: String
    let toState: String
    let actionByName: String
    let actionByRole: String
    let timestamp: Date
    let comments: String?
}

// MARK: - Centralized Workflow Engine Service
final class WorkflowEngine: ObservableObject {
    static let shared = WorkflowEngine()

    @Published var timelineHistory: [String: [WorkflowTimelineItem]] = [:]

    private init() {}

    /// Executes a state transition for an entity with validation and audit trail recording
    func transition(
        entityId: String,
        entityType: String,
        currentState: WorkflowState,
        action: String,
        actorName: String,
        actorRole: String,
        notes: String? = nil
    ) -> WorkflowState {
        let nextState: WorkflowState

        switch (currentState, action) {
        case (.draft, "SUBMIT"):
            nextState = .pendingReview
        case (.pendingReview, "APPROVE"):
            nextState = entityType == "AGREEMENT" ? .legalReview : .approved
        case (.pendingReview, "REJECT"):
            nextState = .rejected
        case (.legalReview, "APPROVE_LEGAL"):
            nextState = .clusterApproval
        case (.clusterApproval, "APPROVE_CLUSTER"):
            nextState = .universityApproval
        case (.universityApproval, "APPROVE_UNIVERSITY"):
            nextState = .active
        case (.approved, "ACTIVATE"):
            nextState = .active
        case (.active, "SUSPEND"):
            nextState = .suspended
        case (.active, "CLOSE"), (.suspended, "CLOSE"):
            nextState = .closed
        default:
            nextState = currentState
        }

        // Record Timeline Item
        let event = WorkflowTimelineItem(
            id: UUID().uuidString,
            entityId: entityId,
            entityType: entityType,
            fromState: currentState.rawValue,
            toState: nextState.rawValue,
            actionByName: actorName,
            actionByRole: actorRole,
            timestamp: Date(),
            comments: notes
        )

        var existing = timelineHistory[entityId] ?? []
        existing.insert(event, at: 0)
        timelineHistory[entityId] = existing

        return nextState
    }
}

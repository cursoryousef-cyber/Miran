//
//  ServiceCatalog.swift
//  Miran
//
//  كتالوج ومحرك الخدمات الديناميكية وحل التبويبات حسب أدوار وصلاحيات الـ RBAC في منصة مِران.
//

import Foundation
import SwiftUI

// MARK: - وجهات الخدمات
enum ServiceDestination: String, Hashable, Identifiable {
    case dashboard
    case schedule
    case logbook
    case competencies
    case trainees
    case evaluations
    case signoffs
    case requests
    case trainers
    case incidents
    case reports
    case hospitals
    case programs
    case capacity
    case notifications
    case digitalCard
    case servicesGrid

    var id: String { rawValue }
}

// MARK: - تعريف الخدمة
struct ServiceDefinition: Identifiable, Hashable, Equatable {
    let id: String
    let titleAr: String
    let titleEn: String
    let icon: String
    let destination: ServiceDestination
    let requiredCapabilities: [String]
    let allowedRoles: [String]
    let isMainTab: Bool

    static func == (lhs: ServiceDefinition, rhs: ServiceDefinition) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - كتالوج الخدمات الرئيسي
struct ServiceCatalog {
    static let allServices: [ServiceDefinition] = [
        // 1. الرئيسية / اللوحة العامة
        ServiceDefinition(
            id: "dashboard",
            titleAr: "الرئيسية",
            titleEn: "Dashboard",
            icon: "house.fill",
            destination: .dashboard,
            requiredCapabilities: [],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin", "hospital_administrator", "training_director", "cluster_administrator", "university_administrator", "platform_owner"],
            isMainTab: true
        ),

        // 2. جدولي / التواجد التدريبي
        ServiceDefinition(
            id: "schedule",
            titleAr: "جدولي",
            titleEn: "My Schedule",
            icon: "calendar",
            destination: .schedule,
            requiredCapabilities: ["schedule.view"],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin", "hospital_administrator", "training_supervisor"],
            isMainTab: true
        ),

        // 3. السجل التدريبي / Logbook
        ServiceDefinition(
            id: "logbook",
            titleAr: "السجل التدريبي",
            titleEn: "Logbook",
            icon: "book.closed.fill",
            destination: .logbook,
            requiredCapabilities: ["logbook.view"],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin", "academic_supervisor"],
            isMainTab: true
        ),

        // 4. الكفاءات والحقيبة
        ServiceDefinition(
            id: "competencies",
            titleAr: "الكفاءات",
            titleEn: "Competencies",
            icon: "checkmark.seal.fill",
            destination: .competencies,
            requiredCapabilities: [],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin"],
            isMainTab: true
        ),

        // 5. المتدربون (للمدرب ومشرف المستشفى)
        ServiceDefinition(
            id: "trainees",
            titleAr: "المتدربون",
            titleEn: "Trainees",
            icon: "person.3.fill",
            destination: .trainees,
            requiredCapabilities: ["trainee.view_hospital", "trainee.view_scope"],
            allowedRoles: ["trainer", "hospital_training_admin", "hospital_administrator", "training_supervisor", "training_director"],
            isMainTab: true
        ),

        // 6. التقييمات
        ServiceDefinition(
            id: "evaluations",
            titleAr: "التقييمات",
            titleEn: "Evaluations",
            icon: "star.square.fill",
            destination: .evaluations,
            requiredCapabilities: ["evaluation.submit", "evaluation.view"],
            allowedRoles: ["trainer", "trainee", "hospital_training_admin", "academic_supervisor"],
            isMainTab: true
        ),

        // 7. اعتماد الإجراءات (Sign-offs)
        ServiceDefinition(
            id: "signoffs",
            titleAr: "اعتماد الإجراءات",
            titleEn: "Sign-offs",
            icon: "signature",
            destination: .signoffs,
            requiredCapabilities: ["logbook.signoff"],
            allowedRoles: ["trainer", "training_supervisor"],
            isMainTab: true
        ),

        // 8. طلبات التدريب
        ServiceDefinition(
            id: "requests",
            titleAr: "طلبات التدريب",
            titleEn: "Training Requests",
            icon: "doc.text.fill",
            destination: .requests,
            requiredCapabilities: ["training_request.view_scope"],
            allowedRoles: ["hospital_training_admin", "hospital_administrator", "training_director", "cluster_administrator", "university_administrator"],
            isMainTab: true
        ),

        // 9. المدربون
        ServiceDefinition(
            id: "trainers",
            titleAr: "المدربون",
            titleEn: "Trainers",
            icon: "stethoscope",
            destination: .trainers,
            requiredCapabilities: ["trainer.view_hospital"],
            allowedRoles: ["hospital_training_admin", "hospital_administrator", "training_supervisor", "training_director"],
            isMainTab: true
        ),

        // 10. البلاغات والتصعيد
        ServiceDefinition(
            id: "incidents",
            titleAr: "البلاغات والتصعيد",
            titleEn: "Incidents",
            icon: "exclamationmark.triangle.fill",
            destination: .incidents,
            requiredCapabilities: ["incident.create", "incident.view"],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin", "hospital_administrator", "training_director", "cluster_administrator"],
            isMainTab: false
        ),

        // 11. التقارير
        ServiceDefinition(
            id: "reports",
            titleAr: "التقارير",
            titleEn: "Reports",
            icon: "chart.bar.doc.horizontal.fill",
            destination: .reports,
            requiredCapabilities: ["report.generate"],
            allowedRoles: ["hospital_training_admin", "hospital_administrator", "training_director", "cluster_administrator", "university_administrator"],
            isMainTab: true
        ),

        // 12. المستشفيات (للتجمع)
        ServiceDefinition(
            id: "hospitals",
            titleAr: "المستشفيات",
            titleEn: "Hospitals",
            icon: "building.2.fill",
            destination: .hospitals,
            requiredCapabilities: ["hospital.view_cluster"],
            allowedRoles: ["training_director", "cluster_administrator", "cluster_manager"],
            isMainTab: true
        ),

        // 13. البرامج التدريبية
        ServiceDefinition(
            id: "programs",
            titleAr: "البرامج",
            titleEn: "Programs",
            icon: "graduationcap.fill",
            destination: .programs,
            requiredCapabilities: ["program.view"],
            allowedRoles: ["training_director", "cluster_administrator", "university_administrator"],
            isMainTab: true
        ),

        // 14. الطاقة الاستيعابية
        ServiceDefinition(
            id: "capacity",
            titleAr: "الطاقة الاستيعابية",
            titleEn: "Capacity",
            icon: "chart.pie.fill",
            destination: .capacity,
            requiredCapabilities: ["capacity.manage"],
            allowedRoles: ["training_director", "cluster_administrator", "hospital_training_admin"],
            isMainTab: true
        ),

        // 15. الإشعارات
        ServiceDefinition(
            id: "notifications",
            titleAr: "الإشعارات",
            titleEn: "Notifications",
            icon: "bell.fill",
            destination: .notifications,
            requiredCapabilities: [],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin", "training_director", "university_administrator"],
            isMainTab: false
        ),

        // 16. البطاقة الرقمية
        ServiceDefinition(
            id: "digitalCard",
            titleAr: "البطاقة الرقمية",
            titleEn: "Digital Card",
            icon: "vcard.fill",
            destination: .digitalCard,
            requiredCapabilities: [],
            allowedRoles: ["trainee"],
            isMainTab: false
        ),

        // 17. شبكة الخدمات الإضافية
        ServiceDefinition(
            id: "servicesGrid",
            titleAr: "الخدمات",
            titleEn: "Services",
            icon: "grid.hifi",
            destination: .servicesGrid,
            requiredCapabilities: [],
            allowedRoles: ["trainee", "trainer", "hospital_training_admin", "training_director"],
            isMainTab: true
        )
    ]
}

// MARK: - محرك حل الخدمات الديناميكية (Service Resolver)
struct ServiceResolver {
    /// يعيد جميع الخدمات المصرح بها للمستخدم بناءً على أدواره وصلاحياته الحقيقية القادمة من /auth/me
    static func authorizedServices(for user: UserProfileResponse) -> [ServiceDefinition] {
        return ServiceCatalog.allServices.filter { service in
            let roleAllowed = service.allowedRoles.isEmpty || service.allowedRoles.contains { user.roles.contains($0) }
            let capabilityAllowed = service.requiredCapabilities.isEmpty || service.requiredCapabilities.contains { cap in
                user.capabilities.contains(cap) || user.permissions.contains(cap)
            }
            return roleAllowed && (capabilityAllowed || service.requiredCapabilities.isEmpty)
        }
    }

    /// التبويبات الرئيسية المخصصة لدور المستخدم (Main Bottom Tabs)
    static func mainTabs(for user: UserProfileResponse) -> [ServiceDefinition] {
        let authorized = authorizedServices(for: user)
        let primaryRole = user.primaryRole

        switch primaryRole {
        case "trainee":
            let ids = ["dashboard", "schedule", "logbook", "competencies", "servicesGrid"]
            return ids.compactMap { id in authorized.first { $0.id == id } }

        case "trainer":
            let ids = ["trainees", "evaluations", "signoffs", "schedule", "logbook", "servicesGrid"]
            return ids.compactMap { id in authorized.first { $0.id == id } }

        case "hospital_training_admin", "hospital_administrator", "hospital_supervisor", "training_supervisor":
            let ids = ["requests", "trainees", "trainers", "schedule", "incidents", "reports", "servicesGrid"]
            return ids.compactMap { id in authorized.first { $0.id == id } }

        case "training_director", "cluster_administrator", "cluster_manager", "org_manager":
            let ids = ["hospitals", "programs", "capacity", "reports", "incidents"]
            return ids.compactMap { id in authorized.first { $0.id == id } }

        default:
            return authorized.filter { $0.isMainTab }
        }
    }

    /// الخدمات الإضافية المعروضة داخل شبكة "الخدمات" (Services Grid Drawer)
    static func extraServices(for user: UserProfileResponse) -> [ServiceDefinition] {
        let authorized = authorizedServices(for: user)
        let mainTabIds = Set(mainTabs(for: user).map { $0.id })
        
        // يعرض الخدمات المسموحة التي ليست ضمن التبويبات الرئيسية بالإضافة للخدمات الإضافية المحتشدة
        var extras = authorized.filter { !mainTabIds.contains($0.id) && $0.id != "servicesGrid" && $0.id != "dashboard" }
        
        // إكمال الخدمات حسب الدور لإثراء واجهة الخدمات
        if user.isTrainee {
            let traineeExtras = ["notifications", "incidents", "digitalCard", "evaluations"]
            let map = Set(extras.map { $0.id })
            for id in traineeExtras {
                if !map.contains(id), let def = authorized.first(where: { $0.id == id }) {
                    extras.append(def)
                }
            }
        } else if user.isTrainer {
            let trainerExtras = ["notifications", "incidents"]
            let map = Set(extras.map { $0.id })
            for id in trainerExtras {
                if !map.contains(id), let def = authorized.first(where: { $0.id == id }) {
                    extras.append(def)
                }
            }
        }
        
        return extras
    }
}

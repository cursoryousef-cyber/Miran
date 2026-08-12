//
//  DynamicMainTabView.swift
//  Miran
//
//  شريط التبويبات الرئيسي المولد ديناميكيًا حسب أدوار وصلاحيات المستخدم (RBAC Resolver).
//

import SwiftUI

struct DynamicMainTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore
    @State private var selectedTabId: String = ""

    var user: UserProfileResponse? { authViewModel.currentUser }

    var mainTabs: [ServiceDefinition] {
        guard let user = user else { return [] }
        return ServiceResolver.mainTabs(for: user)
    }

    var body: some View {
        Group {
            if let user = user, !mainTabs.isEmpty {
                TabView(selection: $selectedTabId) {
                    ForEach(mainTabs) { tab in
                        destinationView(for: tab)
                            .tabItem {
                                Label(tab.titleAr, systemImage: tab.icon)
                            }
                            .tag(tab.id)
                    }
                }
                .tint(MiranTheme.emerald)
                .onAppear {
                    if selectedTabId.isEmpty, let first = mainTabs.first {
                        selectedTabId = first.id
                    }
                }
            } else {
                ProgressView("جاري تهيئة خدمات المنصة...")
            }
        }
    }

    @ViewBuilder
    private func destinationView(for tab: ServiceDefinition) -> some View {
        switch tab.destination {
        case .dashboard:
            if let user = user {
                let persona = ServiceResolver.resolvePersona(for: user)
                switch persona {
                case .trainee:
                    TraineeJourneyHomeView()
                case .trainer:
                    TrainerDashboardFullView()
                case .trainingOperations:
                    HospitalWorkQueueHomeView()
                case .clusterOperations:
                    OrgManagerDashboardFullView()
                case .university:
                    UniversityAdminTabView()
                case .platform:
                    SystemAdminTabView()
                }
            } else {
                TraineeJourneyHomeView()
            }

        case .schedule:
            ScheduleView()

        case .logbook:
            ClinicalLogbookView()

        case .competencies:
            TodayView()

        case .trainees:
            TrainerDashboardFullView()

        case .evaluations:
            TrainerAttendanceView()

        case .signoffs:
            ClinicalLogbookView()

        case .requests:
            OrgManagerDashboardFullView()

        case .trainers:
            TrainingSupervisorDashboardFullView()

        case .incidents:
            Text("البلاغات والتصعيد")
                .font(.headline)

        case .reports:
            OrgManagerDashboardFullView()

        case .hospitals:
            OrgManagerDashboardFullView()

        case .programs:
            OrgManagerDashboardFullView()

        case .capacity:
            OrgManagerDashboardFullView()

        case .servicesGrid:
            DynamicServicesView()

        default:
            DynamicServicesView()
        }
    }
}

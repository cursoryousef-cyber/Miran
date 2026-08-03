//
//  MiranApp.swift
//  مِران — نظام إدارة رحلة المتدرب وقياس الاستجابة
//
//  نقطة الدخول. التطبيق كامل الواجهة بالعربية ومن اليمين لليسار.
//

import SwiftUI

@main
struct MiranApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environment(\.layoutDirection, .rightToLeft)
                .environment(\.locale, Locale(identifier: "ar"))
                .tint(MiranTheme.accent)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: AppStore

    @ViewBuilder
    var body: some View {
        Group {
            if let role = store.role {
                switch role {
                case .trainee:
                    TraineeTabView()
                case .trainer:
                    TrainerTabView()
                case .academic:
                    AcademicTabView()
                }
            } else {
                RoleSelectionView()
            }
        }
        .animation(.easeInOut, value: store.role)
    }
}

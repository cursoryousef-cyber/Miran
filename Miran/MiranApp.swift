//
//  MiranApp.swift
//  مِران — المنصة الوطنية لإدارة التدريب الصحي
//
//  نقطة الدخول الرئيسية بتطبيق iOS.
//

import SwiftUI

@main
struct MiranApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authViewModel)
                .environmentObject(store)
                .environment(\.layoutDirection, .rightToLeft)
                .environment(\.locale, Locale(identifier: "ar"))
                .tint(MiranTheme.accent)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authViewModel.isAuthenticated)
    }
}

struct MainTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TraineeTabView()
                .tabItem {
                  Label("المتدرب", systemImage: "person.text.rectangle")
                }
                .tag(0)

            TrainerTabView()
                .tabItem {
                    Label("المدرب", systemImage: "bolt.heart")
                }
                .tag(1)

            AcademicTabView()
                .tabItem {
                    Label("الأكاديمية", systemImage: "chart.bar.doc.horizontal")
                }
                .tag(2)
        }
    }
}

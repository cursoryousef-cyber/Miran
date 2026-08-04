//
//  MiranApp.swift
//  مِران — المنصة الوطنية لإدارة التدريب الصحي
//
//  نقطة الدخول الرئيسية. التبويبات تُعرض حسب الدور الحقيقي من Backend (RBAC).
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
                .onAppear {
                    authViewModel.appStore = store
                }
        }
    }
}

// MARK: - RootView
struct RootView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                RBACMainView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authViewModel.isAuthenticated)
    }
}

// MARK: - RBAC Main View — يُعرض حسب الدور القادم من Backend
struct RBACMainView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    var user: UserProfileResponse? { authViewModel.currentUser }

    var body: some View {
        Group {
            if let user = user {
                switch user.primaryRole {
                case "platform_owner", "org_manager":
                    OrgManagerTabView()
                case "academic_supervisor":
                    AcademicTabView()
                case "trainer":
                    TrainerTabView()
                case "trainee":
                    TraineeTabView()
                default:
                    // دور غير معروف — عرض بيانات أساسية فقط
                    UnknownRoleView(roleCode: user.primaryRole)
                }
            } else {
                // لم تُجلب بيانات المستخدم بعد
                ProgressView("جاري تحميل البيانات...")
                    .task { await store.fetchAllProductionData() }
            }
        }
    }
}

// MARK: - Org Manager Tab View (مدير الجهة + Platform Owner)
struct OrgManagerTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            AcademicTabView()
                .tabItem { Label("لوحة الإدارة", systemImage: "chart.bar.doc.horizontal") }
                .tag(0)

            TrainerTabView()
                .tabItem { Label("النداءات", systemImage: "bolt.heart") }
                .tag(1)

            // لوحة إدارة الأعضاء — مدير الجهة فقط
            OrgMembersView()
                .tabItem { Label("إدارة الأعضاء", systemImage: "person.3.fill") }
                .tag(2)
        }
    }
}

// MARK: - Unknown Role View
struct UnknownRoleView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    let roleCode: String

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.shield.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            Text("دور غير معروف")
                .font(.title.bold())
            Text("الدور المعيّن: \(roleCode)")
                .foregroundStyle(.secondary)
            Text("يرجى التواصل مع مسؤول النظام لتعيين دور صحيح لحسابك.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 40)
            Button("تسجيل الخروج") {
                authViewModel.logout()
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        }
    }
}

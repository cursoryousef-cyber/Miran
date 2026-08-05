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
                case "platform_owner", "system_admin":
                    // 1. مدير المنصة / مدير النظام: واجهة حصرية لـ Platform Management فقط بدون نداءات ميدانية
                    SystemAdminTabView()

                case "org_manager":
                    // 2. مدير الجهة: إدارة أعضاء الجهة والبرامج والدفعات والموافقات والتقارير
                    OrgManagerTabView()

                case "academic_supervisor":
                    // 3. المشرف الأكاديمي: إدارة العملية الأكاديمية والمتابعة والـ Logbook والاعتمادات
                    AcademicSupervisorTabView()

                case "training_supervisor", "training_manager":
                    // 4. مشرف التدريب: إدارة التدريب الميداني والجداول ومركز النداءات
                    TrainingSupervisorTabView()

                case "trainer":
                    // 5. المدرب: المتدربين، التقييم، الأنشطة، والنداءات الميدانية
                    TrainerTabView()

                case "trainee":
                    // 6. المتدرب: جدولي، حضوري، السجل السريري، واستقبال النداءات فقط
                    TraineeTabView()

                default:
                    // دور غير معروف — عرض بيانات أساسية وتنبيه التواصل
                    UnknownRoleView(roleCode: user.primaryRole)
                }
            } else {
                // لم تُجلب بيانات المستخدم بعد أو جاري التحميل
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("جاري تحميل بيانات المنصة...")
                        .font(.subheadline)
                        .foregroundColor(MiranTheme.subtext)

                    if let err = authViewModel.errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }

                    Button {
                        Task {
                            await authViewModel.fetchProfile()
                            await store.fetchAllProductionData()
                        }
                    } label: {
                        Label("إعادة المحاولة", systemImage: "arrow.clockwise")
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(MiranTheme.emerald)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }

                    Button("إلغاء وتسجيل الدخول ببيانات أخرى") {
                        authViewModel.logout()
                    }
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
                }
                .padding()
                .task {
                    await authViewModel.fetchProfile()
                    await store.fetchAllProductionData()
                }
            }
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

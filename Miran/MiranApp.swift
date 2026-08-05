//
//  MiranApp.swift
//  مِران — المنصة الوطنية لإدارة التدريب الصحي (National Healthcare Internship Platform)
//
//  نقطة الدخول الرئيسية. التبويبات والمحركات تُعرض بصفة حصرية ودقيقة حسب الدور (RBAC Pipeline).
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

// MARK: - RBAC Main View — يُعرض بصفة حصرية حسب الدور الحقيقي للامتياز الصحي
struct RBACMainView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    var user: UserProfileResponse? { authViewModel.currentUser }

    var body: some View {
        Group {
            if let user = user {
                switch user.primaryRole {
                case "platform_owner", "system_admin":
                    // 1. مدير المنصة / مدير النظام: مركز التحكم الوطني (Control Center) محجوب منه التشغيل اليومي
                    SystemAdminTabView()

                case "university_admin":
                    // 2. إدارة الجامعة: رفع الطلاب والبرامج والخطط وتقديم الطلبات للتجمع
                    UniversityAdminTabView()

                case "cluster_manager", "training_manager", "org_manager":
                    // 3. إدارة التدريب بالتجمع الصحي: مراجعة طلبات الجامعات وتوزيع السعة على المستشفيات
                    ClusterTrainingAdminTabView()

                case "hospital_supervisor", "training_supervisor":
                    // 4. مشرف امتياز المستشفى: قبول الطلاب، تحديد التواريخ، توزيع الأقسام وإسناد المدرب
                    HospitalSupervisorTabView()

                case "trainer":
                    // 5. المدرب الميداني (استشاري/أخصائي): الطلاب المسندين إليه، الحضور، Logbook Sign-off والتقييم النهائي
                    TrainerTabView()

                case "trainee":
                    // 6. المتدرب (طبيب الامتياز): جدولي، البرنامج، القسم، المدرب المباشر، والمهام والبطاقة
                    TraineeTabView()

                case "academic_supervisor":
                    // 7. المشرف الأكاديمي (MVP): لا يشارك بالتشغيل اليومي — اعتماد النتيجة وإكمال البرنامج النهائي فقط
                    AcademicSupervisorTabView()

                default:
                    UnknownRoleView(roleCode: user.primaryRole)
                }
            } else {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("جاري تحميل بيانات المنصة والـ RBAC...")
                        .font(.subheadline)
                        .foregroundColor(MiranTheme.subtext)

                    if let err = authViewModel.errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(MiranTheme.background.ignoresSafeArea())
            }
        }
    }
}

// MARK: - Unknown Role Fallback View
struct UnknownRoleView: View {
    let roleCode: String
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.shield.fill")
                .font(.system(size: 60))
                .foregroundColor(.amber)

            Text("رمز الدور غامض: \(roleCode)")
                .font(.title3.bold())
                .foregroundColor(.white)

            Text("حسابك يملك رمز دور محدد ولكن لا توجد لوحة تحكم مطابقة في نظام الـ RBAC الحالي.")
                .font(.caption)
                .foregroundColor(MiranTheme.subtext)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button {
                authViewModel.logout()
            } label: {
                Text("تسجيل الخروج وإعادة المحاولة")
                    .font(.headline)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MiranTheme.background.ignoresSafeArea())
    }
}

// MARK: - University Admin TabView
struct UniversityAdminTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            UniversityAdminDashboardView()
                .tabItem {
                    Label("الجامعة والبرامج", systemImage: "graduationcap.fill")
                }
                .tag(0)
        }
        .tint(MiranTheme.emerald)
    }
}

// MARK: - University Admin Dashboard
struct UniversityAdminDashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("إدارة جامعة الحدود الشمالية (University Admin)")
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "graduationcap.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(.purple)
                            }
                            Text("رفع خطط الامتياز وتقديم طلبات التدريب للكلية")
                                .font(.subheadline)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            MetricStatCard(title: "طلاب الامتياز المسجلين", count: "140", icon: "person.3.fill", color: .purple)
                            MetricStatCard(title: "طلبات التدريب المرسلة", count: "4", icon: "paperplane.fill", color: MiranTheme.emerald)
                            MetricStatCard(title: "البرامج التدريبية", count: "3", icon: "book.fill", color: .blue)
                            MetricStatCard(title: "النتائج النهائية المعتمدة", count: "128", icon: "award.fill", color: .orange)
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("إدارة الجامعة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { authViewModel.logout() } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
        }
    }
}

// MARK: - Cluster Training Admin TabView
struct ClusterTrainingAdminTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            OrgManagerDashboardFullView()
                .tabItem {
                    Label("إدارة التدريب بالتجمع", systemImage: "building.2.crop.circle.fill")
                }
                .tag(0)
        }
        .tint(MiranTheme.emerald)
    }
}

// MARK: - Hospital Supervisor TabView
struct HospitalSupervisorTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TrainingSupervisorDashboardFullView()
                .tabItem {
                    Label("مشرف امتياز المستشفى", systemImage: "cross.case.circle.fill")
                }
                .tag(0)
        }
        .tint(MiranTheme.emerald)
    }
}

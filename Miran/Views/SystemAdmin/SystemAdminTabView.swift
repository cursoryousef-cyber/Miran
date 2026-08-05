//
//  SystemAdminTabView.swift
//  Miran
//
//  SwiftUI Main Interface for System Administrator (مدير المنصة والنظام).
//  حصرية لإدارة المنصة، الجهات، المستشفيات، الحسابات، الصلاحيات، والسجلات.
//  محجوب منها بالكامل: شاشات النداءات، إطلاق النداءات، وتطبيقات التدريب الميداني.
//

import SwiftUI

struct SystemAdminTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // 1. لوحة التحكم الكلية والإحصائيات العامة
            SystemAdminDashboardView()
                .tabItem {
                    Label("لوحة الإدارة", systemImage: "chart.bar.fill")
                }
                .tag(0)

            // 2. إدارة الجهات والتجمعات والمستشفيات
            OrganizationsAdminView()
                .tabItem {
                    Label("الجهات والأقسام", systemImage: "building.2.fill")
                }
                .tag(1)

            // 3. إدارة الحسابات والأدوار والصلاحيات
            UsersAndRolesAdminView()
                .tabItem {
                    Label("المستخدمين والصلاحيات", systemImage: "person.3.sequence.fill")
                }
                .tag(2)

            // 4. السجلات والتقارير العامة للعمليات
            AuditAndReportsAdminView()
                .tabItem {
                    Label("السجلات والتقارير", systemImage: "shield.checkered")
                }
                .tag(3)
        }
        .tint(MiranTheme.emerald)
    }
}

// MARK: - System Admin Dashboard View
struct SystemAdminDashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Admin Banner
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("إدارة المنصة الوطنية (System Admin)")
                                    .font(.title2.weight(.bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "shield.badge.checkmark.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                            Text("التحكم الكامل بالحسابات والجهات والترخيص وسجلات التدقيق")
                                .font(.caption)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Key Metrics Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                            MetricStatCard(title: "الأقسام المعتمدة", count: "\(store.departments.count)", icon: "building.2", color: MiranTheme.emerald)
                            MetricStatCard(title: "المشاركون في الأنشطة", count: "\(store.trainees.count)", icon: "cross.case", color: MiranTheme.teal)
                            MetricStatCard(title: "المدربين النشطين", count: "\(store.trainers.count)", icon: "person.2", color: .blue)
                            MetricStatCard(title: "الروتيشنات الجارية", count: "\(store.rotations.count)", icon: "graduationcap", color: .purple)
                        }
                        .padding(.horizontal)

                        // Quick Actions
                        VStack(alignment: .leading, spacing: 12) {
                            Text("العمليات الإدارية الحصرية")
                                .font(.headline.weight(.bold))
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            VStack(spacing: 10) {
                                NavigationLink(destination: OrganizationsAdminView()) {
                                    AdminActionRow(title: "إدارة التجمعات الصحية والأقسام", subtitle: "إضافة وتعديل وحظر الجهات المعتمدة", icon: "building.columns.fill", color: MiranTheme.emerald)
                                }

                                NavigationLink(destination: UsersAndRolesAdminView()) {
                                    AdminActionRow(title: "إدارة الحسابات والأدوار (RBAC)", subtitle: "تعيين وتأهيل أدوار المشرفين والمدربين", icon: "person.badge.key.fill", color: .blue)
                                }

                                NavigationLink(destination: AuditAndReportsAdminView()) {
                                    AdminActionRow(title: "سجل العمليات والتقارير الكلية (Audit Trail)", subtitle: "تتبع نشاط الحسابات والأمن بالمنصة", icon: "doc.text.magnifyingglass", color: .orange)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("مدير النظام")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        authViewModel.logout()
                    } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
        }
    }
}

// MARK: - Helper Views for System Admin
struct MetricStatCard: View {
    let title: String
    let count: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundColor(color)
                Spacer()
                Text(count)
                    .font(.title2.weight(.bold))
                    .foregroundColor(.white)
            }
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundColor(MiranTheme.subtext)
        }
        .padding()
        .background(Color.white.opacity(0.04))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
    }
}

struct AdminActionRow: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 40, height: 40)
                .background(color.opacity(0.15))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.white)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(MiranTheme.subtext)
            }
            Spacer()
            Image(systemName: "chevron.left")
                .font(.caption)
                .foregroundColor(MiranTheme.subtext)
        }
        .padding()
        .background(Color.white.opacity(0.04))
        .cornerRadius(14)
    }
}

struct OrganizationsAdminView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        List {
            Section(header: Text("الأقسام والمستشفيات المعتمدة").foregroundColor(MiranTheme.emerald)) {
                ForEach(store.departments, id: \.id) { dept in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(dept.name)
                            .font(.body.weight(.bold))
                            .foregroundColor(.white)
                        HStack {
                            Text("السعة: \(dept.capacity) متدرب")
                                .font(.caption.monospaced())
                                .foregroundColor(MiranTheme.emerald)
                            Spacer()
                            Text(dept.roundLocation)
                                .font(.caption2)
                                .foregroundColor(MiranTheme.subtext)
                        }
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(Color.white.opacity(0.04))
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MiranTheme.background.ignoresSafeArea())
        .navigationTitle("إدارة الأقسام والمستشفيات")
    }
}

struct UsersAndRolesAdminView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        List {
            Section(header: Text("قائمة المدربين المشرفين").foregroundColor(MiranTheme.teal)) {
                ForEach(store.trainers, id: \.id) { trn in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(trn.nameAr)
                                .font(.body.weight(.bold))
                                .foregroundColor(.white)
                            Text(trn.title)
                                .font(.caption)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        Spacer()
                        Text("مدرب")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(MiranTheme.emerald.opacity(0.2))
                            .foregroundColor(MiranTheme.emerald)
                            .cornerRadius(6)
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(Color.white.opacity(0.04))
                }
            }

            Section(header: Text("قائمة المتدربين المسجلين").foregroundColor(MiranTheme.emerald)) {
                ForEach(store.trainees, id: \.id) { trn in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(trn.nameAr)
                                .font(.body.weight(.bold))
                                .foregroundColor(.white)
                            Text(trn.email)
                                .font(.caption.monospaced())
                                .foregroundColor(MiranTheme.subtext)
                        }
                        Spacer()
                        Text(trn.level.title)
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.2))
                            .foregroundColor(.blue)
                            .cornerRadius(6)
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(Color.white.opacity(0.04))
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MiranTheme.background.ignoresSafeArea())
        .navigationTitle("إدارة الحسابات والأدوار")
    }
}

struct AuditAndReportsAdminView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(MiranTheme.emerald)
            Text("سجلات التدقيق والمراقبة العامة (Audit Trail)")
                .font(.title3.bold())
                .foregroundColor(.white)
            Text("جميع عمليات النظام الحساسة وتحديثات الصلاحيات والجهات موثقة بختم زمني مشفر.")
                .font(.caption)
                .foregroundColor(MiranTheme.subtext)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MiranTheme.background.ignoresSafeArea())
        .navigationTitle("سجل العمليات والتقارير")
    }
}

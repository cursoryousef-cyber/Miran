//
//  SystemAdminTabView.swift
//  Miran
//
//  SwiftUI Main Interface for System Administrator (مدير المنصة والنظام).
//  حصرية لإدارة المنصة، الجهات، المستشفيات، الحسابات، الصلاحيات، والسجلات.
//

import SwiftUI

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
                                Text("إدارة المنصة الوطنية (Control Center)")
                                    .font(.title2.weight(.bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "shield.badge.checkmark.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                            Text("مركز التحكم والمراقبة الشاملة وصحة API وحالة الخادم")
                                .font(.caption)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Comprehensive 12 Key Metrics Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            Group {
                                MetricStatCard(title: "الجهات والتجمعات", count: "8", icon: "building.2.crop.circle", color: MiranTheme.emerald)
                                MetricStatCard(title: "المستشفيات المعتمدة", count: "14", icon: "cross.case.fill", color: .blue)
                                MetricStatCard(title: "الجامعات والكليات", count: "6", icon: "graduationcap.fill", color: .purple)
                                MetricStatCard(title: "الأقسام السريرية", count: "42", icon: "building.columns", color: MiranTheme.teal)
                                MetricStatCard(title: "البرامج التدريبية", count: "18", icon: "list.clipboard.fill", color: .orange)
                                MetricStatCard(title: "الدفعات الأكاديمية", count: "24", icon: "person.3.fill", color: .pink)
                            }
                            Group {
                                MetricStatCard(title: "أطباء الامتياز المتدربين", count: "310", icon: "person.badge.shield.checkmark", color: MiranTheme.emerald)
                                MetricStatCard(title: "المدربين المعتمدين", count: "85", icon: "stethoscope", color: .indigo)
                                MetricStatCard(title: "المشرفين الأكاديميين", count: "29", icon: "person.crop.rectangle.stack", color: .yellow)
                                MetricStatCard(title: "نداءات الميدان الحية", count: "12", icon: "bell.and.waves.left.and.right.fill", color: .red)
                                MetricStatCard(title: "حالات Logbook المعتمدة", count: "1,420", icon: "doc.text.fill", color: MiranTheme.emerald)
                                MetricStatCard(title: "إجمالي الحسابات المسجلة", count: "468", icon: "key.fill", color: .cyan)
                            }
                        }
                        .padding(.horizontal)

                        // Quick Actions List
                        VStack(alignment: .leading, spacing: 12) {
                            Text("القائمة الرئيسية والتحكم الكامل")
                                .font(.headline.weight(.bold))
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            VStack(spacing: 10) {
                                NavigationLink(destination: OrganizationsAdminView()) {
                                    AdminActionRow(title: "إدارة الجهات والتجمعات والمستشفيات", subtitle: "إضافة وتعديل وحظر التجمعات والمراكز الصحية", icon: "building.columns.fill", color: MiranTheme.emerald)
                                }

                                NavigationLink(destination: UsersAndRolesAdminView()) {
                                    AdminActionRow(title: "إدارة المستخدمين والأدوار والصلاحيات (RBAC)", subtitle: "التحكم بمدراء التجمعات والأكاديميين والمدربين", icon: "person.badge.key.fill", color: .blue)
                                }

                                NavigationLink(destination: ClinicalLogbookManagementFullView()) {
                                    AdminActionRow(title: "السجل السريري وحالات Logbook الوطنية", subtitle: "استعلام ومتابعة نسب إنجاز المهارات المعتمدة", icon: "cross.case.fill", color: MiranTheme.teal)
                                }

                                NavigationLink(destination: AuditAndReportsAdminView()) {
                                    AdminActionRow(title: "سجلات العمليات والتدقيق (Audit Trail)", subtitle: "تتبع نشاط الحسابات المشفرة بالمنصة", icon: "shield.checkered", color: .orange)
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

struct OrganizationsAdminView: View {
    var body: some View {
        OrganizationsManagementFullView()
    }
}

struct UsersAndRolesAdminView: View {
    var body: some View {
        UsersAndRolesManagementFullView()
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

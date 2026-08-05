//
//  SystemAdminTabView.swift
//  Miran
//
//  SwiftUI Main Interface for System Administrator (مدير المنصة والنظام - Control Center).
//  Pure Platform Administration (Organizations, Universities, Hospitals, Programs, Users, RBAC, Agreements, Reports, Audit, Settings).
//  EXCLUDES: Daily Operational screens (Trainees, Rotations, Attendance, Logbook, Live Calls).
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
            // 1. مركز التحكم الوطني والإحصائيات الكلية
            SystemAdminDashboardView()
                .tabItem {
                    Label("مركز التحكم", systemImage: "chart.bar.fill")
                }
                .tag(0)

            // 2. إدارة الجهات والجامعات والمستشفيات
            OrganizationsAdminView()
                .tabItem {
                    Label("الجهات والمستشفيات", systemImage: "building.2.fill")
                }
                .tag(1)

            // 3. إدارة المستخدمين والأدوار والصلاحيات
            UsersAndRolesAdminView()
                .tabItem {
                    Label("المستخدمين وRBAC", systemImage: "person.3.sequence.fill")
                }
                .tag(2)

            // 4. سجلات التدقيق والمراقبة العامة
            AuditAndReportsAdminView()
                .tabItem {
                    Label("سجلات التدقيق", systemImage: "shield.checkered")
                }
                .tag(3)
        }
        .tint(MiranTheme.emerald)
    }
}

// MARK: - System Admin Control Center View (Purified Control Center)
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
                        // Control Center Banner
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("مركز التحكم الوطني (Control Center)")
                                    .font(.title2.weight(.bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "shield.badge.checkmark.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                            Text("التحكم الكلي بالمنصة والجهات والجامعات والمستشفيات والـ RBAC وسجلات الرقابة")
                                .font(.caption)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Pure Admin Metrics Grid (10 Core Metrics — No Operational Data)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            Group {
                                MetricStatCard(title: "الجهات والتجمعات الصحية", count: "8", icon: "building.2.crop.circle", color: MiranTheme.emerald)
                                MetricStatCard(title: "المستشفيات المعتمدة", count: "14", icon: "cross.case.fill", color: .blue)
                                MetricStatCard(title: "الجامعات والكليات", count: "6", icon: "graduationcap.fill", color: .purple)
                                MetricStatCard(title: "البرامج التدريبية الوطنية", count: "18", icon: "list.clipboard.fill", color: .orange)
                                MetricStatCard(title: "اتفاقيات الشراكة العقدية", count: "12", icon: "doc.plaintext.fill", color: MiranTheme.teal)
                            }
                            Group {
                                MetricStatCard(title: "إجمالي حسابات المستخدمين", count: "468", icon: "key.fill", color: .cyan)
                                MetricStatCard(title: "مدراء التجمعات الصحيّة", count: "12", icon: "person.badge.key.fill", color: .indigo)
                                MetricStatCard(title: "سجلات التدقيق والمراقبة", count: "3,480", icon: "shield.checkered", color: .pink)
                                MetricStatCard(title: "حالة سلامة الـ APIs", count: "100%", icon: "activity", color: MiranTheme.emerald)
                                MetricStatCard(title: "إقرارات الترخيص", count: "24", icon: "checkmark.seal.fill", color: .yellow)
                            }
                        }
                        .padding(.horizontal)

                        // Pure Admin Management Action Rows
                        VStack(alignment: .leading, spacing: 12) {
                            Text("إدارة وحدات المنصة والتحكم")
                                .font(.headline.weight(.bold))
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            VStack(spacing: 10) {
                                NavigationLink(destination: OrganizationsAdminView()) {
                                    AdminActionRow(title: "إدارة التجمعات والجامعات والمستشفيات (Organizations)", subtitle: "إضافة وتعديل واعتماد المراكز والجامعات", icon: "building.columns.fill", color: MiranTheme.emerald)
                                }

                                NavigationLink(destination: UsersAndRolesAdminView()) {
                                    AdminActionRow(title: "إدارة المستخدمين والأدوار والصلاحيات (Users & RBAC)", subtitle: "إدارة الحسابات والأدوار والـ Policy Claims", icon: "person.badge.key.fill", color: .blue)
                                }

                                NavigationLink(destination: AuditAndReportsAdminView()) {
                                    AdminActionRow(title: "سجلات التدقيق والرقابة (Audit Logs)", subtitle: "مراقبة سجل التغييرات والـ Event Ledger المشفر", icon: "shield.checkered", color: .orange)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("مدير المنصة والنظام")
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
            Text("سجلات التدقيق والرقابة الوطنية (Audit Trail)")
                .font(.title3.bold())
                .foregroundColor(.white)
            Text("جميع عمليات إضافة الحسابات، تعديل الصلاحيات، واعتماد التجمعات موثقة بختم زمني مشفر.")
                .font(.caption)
                .foregroundColor(MiranTheme.subtext)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MiranTheme.background.ignoresSafeArea())
        .navigationTitle("سجل العمليات والتدقيق")
    }
}

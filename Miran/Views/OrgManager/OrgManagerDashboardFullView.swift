//
//  OrgManagerDashboardFullView.swift
//  Miran
//
//  Dedicated Dashboard Interface for Organization & Health Cluster Managers.
//

import SwiftUI

struct OrgManagerDashboardFullView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Org Manager Header Banner
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("لوحة قيادة التجمع الصحي (Org Manager)")
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "building.2.crop.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                            Text(authViewModel.currentUser?.activeOrganization.nameAr ?? "تجمع الحدود الشمالية الصحي")
                                .font(.subheadline)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Cluster Metrics Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            MetricStatCard(title: "المتدربين بالجهة", count: "128", icon: "person.3.fill", color: MiranTheme.emerald)
                            MetricStatCard(title: "المدربين المعتمدين", count: "34", icon: "stethoscope", color: .blue)
                            MetricStatCard(title: "المشرفين الأكاديميين", count: "12", icon: "person.badge.shield.checkmark", color: .purple)
                            MetricStatCard(title: "البرامج التدريبية", count: "6", icon: "list.clipboard.fill", color: .orange)
                            MetricStatCard(title: "معدل إنجاز الروتيشنات", count: "89%", icon: "chart.line.uptrend.xyaxis", color: MiranTheme.teal)
                            MetricStatCard(title: "طلبات الاعتماد المعلقة", count: "5", icon: "clock.badge.exclamationmark", color: .red)
                        }
                        .padding(.horizontal)

                        // Cluster Operations
                        VStack(alignment: .leading, spacing: 12) {
                            Text("إدارة التجمع والاعتمادات")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            VStack(spacing: 10) {
                                NavigationLink(destination: OrgMembersView()) {
                                    AdminActionRow(title: "أعضاء التجمع الصحي والجهات المعتمدة", subtitle: "إدارة المدربين والمتربين المسندين للتجمع", icon: "person.crop.rectangle.stack.fill", color: MiranTheme.emerald)
                                }

                                NavigationLink(destination: ClinicalLogbookManagementFullView()) {
                                    AdminActionRow(title: "مراقبة وإقرار سجلات المهارات (Sign-off)", subtitle: "اعتماد السجلات السريرية المكتملة بالجهة", icon: "checkmark.seal.fill", color: .blue)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("مدير الجهة والتجمع")
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

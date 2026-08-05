//
//  AcademicSupervisorDashboardFullView.swift
//  Miran
//
//  Dedicated Dashboard Interface for Academic Supervisors.
//  Includes Trainee Portfolio Tracking, Logbook Sign-off, Hour Approval, and Evaluation.
//

import SwiftUI

struct AcademicSupervisorDashboardFullView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Header Banner
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("الشؤون الأكاديمية (Academic Supervisor)")
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "graduationcap.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(.purple)
                            }
                            Text("متابعة الاعتماد الأكاديمي للجامعة وأطباء الامتياز")
                                .font(.subheadline)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Academic Metrics Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            MetricStatCard(title: "طلاب الامتياز المسندين", count: "48", icon: "person.3.sequence.fill", color: .purple)
                            MetricStatCard(title: "البرامج الأكاديمية", count: "4", icon: "book.closed.fill", color: MiranTheme.emerald)
                            MetricStatCard(title: "طلبات اعتماد Logbook", count: "9", icon: "clock.arrow.circlepath", color: .orange)
                            MetricStatCard(title: "نسبة إنجاز الدفعة", count: "92%", icon: "chart.bar.fill", color: MiranTheme.teal)
                        }
                        .padding(.horizontal)

                        // Academic Actions & Logbook Approval
                        VStack(alignment: .leading, spacing: 12) {
                            Text("متابعة واعتماد السجلات السريرية")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            VStack(spacing: 10) {
                                NavigationLink(destination: ClinicalLogbookManagementFullView()) {
                                    AdminActionRow(title: "اعتماد السجل السريري واكتساب الساعات", subtitle: "مراجعة وإقرار المهارات أو إعادتها للتعديل", icon: "checkmark.circle.badge.questionmark", color: .purple)
                                }

                                NavigationLink(destination: ReportsView()) {
                                    AdminActionRow(title: "تقارير تقييم المستشفيات والمدربين", subtitle: "متابعة أداء المراكز الميدانية وجودة التدريب", icon: "doc.text.fill", color: .blue)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("المشرف الأكاديمي")
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

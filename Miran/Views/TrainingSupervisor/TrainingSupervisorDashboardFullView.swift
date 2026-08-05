//
//  TrainingSupervisorDashboardFullView.swift
//  Miran
//
//  Dedicated Dashboard Interface for Field Training Supervisors.
//  Includes Trainee Assignment, Rotation Shifting, Department Allocation, and Live Call Monitoring.
//

import SwiftUI

struct TrainingSupervisorDashboardFullView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    @State private var showTransferSheet = false

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Header Banner
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("مشرف التدريب الميداني (Training Supervisor)")
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "cross.case.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                            Text("إدارة التوزيع الميداني والشيفتات بمستشفى برج الشمال الطبي")
                                .font(.subheadline)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Metrics Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            MetricStatCard(title: "المتدربين بالميدان", count: "64", icon: "person.2.fill", color: MiranTheme.emerald)
                            MetricStatCard(title: "الأقسام السريرية", count: "8", icon: "building.2.fill", color: .blue)
                            MetricStatCard(title: "شيفتات اليوم النشطة", count: "12", icon: "clock.fill", color: .orange)
                            MetricStatCard(title: "نداءات الميدان الحية", count: "3", icon: "bell.and.waves.left.and.right.fill", color: .red)
                        }
                        .padding(.horizontal)

                        // Operations & Assignment Tool
                        VStack(alignment: .leading, spacing: 12) {
                            Text("عمليات التوزيع والتحويل الميداني")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            VStack(spacing: 10) {
                                Button {
                                    showTransferSheet = true
                                } label: {
                                    AdminActionRow(title: "التوزيع الذكي ونقل المتدربين بين الأقسام", subtitle: "إسناد وتغيير قسم المتدرب حسب الطاقة الاستيعابية والمدربين", icon: "arrow.triangle.branch", color: MiranTheme.emerald)
                                }

                                NavigationLink(destination: CallCenterView()) {
                                    AdminActionRow(title: "مركز التحكم بالنداءات والاستدعاءات", subtitle: "متابعة زمن استجابة المتدربين للنداءات العاجلة", icon: "bell.badge.fill", color: .red)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("مشرف التدريب الميداني")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { authViewModel.logout() } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
            .sheet(isPresented: $showTransferSheet) {
                TraineeTransferSheet()
            }
        }
    }
}

// MARK: - Trainee Transfer Modal
struct TraineeTransferSheet: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedDepartment = "NT-INT-MED"
    @State private var selectedTrainer = "drsalem"

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                VStack(spacing: 16) {
                    Text("إعادة توزيع ونقل المتدرب للقسم السريري")
                        .font(.headline)
                        .foregroundColor(.white)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("اختر القسم السريري الجديد")
                            .font(.caption.bold())
                            .foregroundColor(MiranTheme.subtext)
                        Picker("القسم", selection: $selectedDepartment) {
                            Text("قسم الباطنة العامة — برج الشمال").tag("NT-INT-MED")
                            Text("قسم الجراحة العامة وجراحة اليوم الواحد").tag("NT-SURGERY")
                            Text("قسم الطوارئ والحوادث المتقدمة").tag("NT-ER")
                        }
                        .pickerStyle(.menu)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(10)
                        .tint(.white)
                    }

                    Button {
                        dismiss()
                    } label: {
                        Text("اعتماد التوزيع والنقل الفوري")
                            .font(.headline.bold())
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(MiranTheme.emerald)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("توزيع الميدان")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("إلغاء") { dismiss() }
                        .foregroundColor(.red)
                }
            }
        }
    }
}

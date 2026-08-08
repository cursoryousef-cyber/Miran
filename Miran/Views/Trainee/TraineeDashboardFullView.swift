//
//  TraineeDashboardFullView.swift
//  Miran
//
//  Dedicated Interactive Dashboard Interface for Trainees / Interns.
//  Presents Active Rotation, Department, Clinical Competencies, Tasks, ID Card, and Emergency Alert Triggers.
//

import SwiftUI

struct TraineeDashboardFullView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore
    @StateObject private var traineeVM = TraineeViewModel()

    @State private var showNewCaseSheet = false
    @State private var showDigitalIDSheet = false
    @State private var showColleaguesSheet = false

    private var activeRotation: RotationModel? {
        traineeVM.rotations.first(where: { $0.status == "active" })
    }

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Trainee Header Banner
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("أهلاً بك، \(authViewModel.currentUser?.nameAr ?? "طبيب الامتياز")")
                                        .font(.title2.bold())
                                        .foregroundColor(.white)
                                    Text(traineeVM.traineeProfile?.organization?.nameAr ?? "—")
                                        .font(.subheadline)
                                        .foregroundColor(MiranTheme.subtext)
                                }
                                Spacer()
                                Button {
                                    showDigitalIDSheet = true
                                } label: {
                                    Image(systemName: "vcard.fill")
                                        .font(.title)
                                        .foregroundColor(MiranTheme.emerald)
                                }
                            }
                        }
                        .padding(.horizontal)

                        // Current Rotation Active Card
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Label("الروتيشن الحالي والتدريب الميداني", systemImage: "clock.badge.checkmark.fill")
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                if activeRotation != nil {
                                    Text("نشط الان 🟢")
                                        .font(.caption2.bold())
                                        .foregroundColor(MiranTheme.emerald)
                                }
                            }

                            if let rotation = activeRotation {
                                HStack(spacing: 16) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("القسم السريري:")
                                            .font(.caption)
                                            .foregroundColor(MiranTheme.subtext)
                                        Text(rotation.department?.nameAr ?? "—")
                                            .font(.subheadline.bold())
                                            .foregroundColor(.white)
                                    }

                                    Spacer()

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("المدرب المباشر:")
                                            .font(.caption)
                                            .foregroundColor(MiranTheme.subtext)
                                        Text(rotation.trainerProfile?.person?.nameAr ?? "—")
                                            .font(.subheadline.bold())
                                            .foregroundColor(MiranTheme.emerald)
                                    }
                                }

                                Divider().background(Color.white.opacity(0.1))

                                Text("\(String(rotation.startDate.prefix(10))) → \(String(rotation.endDate.prefix(10)))")
                                    .font(.caption.monospaced())
                                    .foregroundColor(MiranTheme.subtext)
                            } else {
                                Text("لا يوجد روتيشن نشط حالياً")
                                    .font(.subheadline)
                                    .foregroundColor(MiranTheme.subtext)
                            }
                        }
                        .padding()
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(16)
                        .padding(.horizontal)

                        // Colleagues
                        Button {
                            showColleaguesSheet = true
                        } label: {
                            AdminActionRow(
                                title: "زملائي في التدريب",
                                subtitle: traineeVM.colleagues.isEmpty ? "لا يوجد زملاء آخرون في هذا الدوران" : "\(traineeVM.colleagues.count) زميل في نفس الروتيشن",
                                icon: "person.2.fill",
                                color: MiranTheme.emerald
                            )
                        }
                        .padding(.horizontal)

                        // Actions
                        HStack(spacing: 12) {
                            Button {
                                showNewCaseSheet = true
                            } label: {
                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                    Text("تسجيل حالة سريرية")
                                        .font(.caption.bold())
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(MiranTheme.emerald)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)

                        // Logbook Status
                        VStack(alignment: .leading, spacing: 12) {
                            Text("السجل السريري وحالات اليوم")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            NavigationLink(destination: ClinicalLogbookManagementFullView()) {
                                AdminActionRow(title: "سجل الحالات والـ Logbook الخاص بك", subtitle: "متابعة الحالات المسجلة بانتظار الاعتماد من مدربك", icon: "doc.text.fill", color: MiranTheme.emerald)
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("لوحة المتدرب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { authViewModel.logout() } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
            .sheet(isPresented: $showDigitalIDSheet) {
                DigitalIDCardView(profile: traineeVM.traineeProfile, rotation: activeRotation, qrToken: traineeVM.cardQrToken)
            }
            .sheet(isPresented: $showColleaguesSheet) {
                TrainingColleaguesView(colleagues: traineeVM.colleagues)
            }
            .sheet(isPresented: $showNewCaseSheet) {
                CreateClinicalCaseSheet {
                    // Refresh action
                }
            }
            .task {
                await traineeVM.fetchDashboardData()
            }
        }
    }
}

// MARK: - Colleagues sheet

struct TrainingColleaguesView: View {
    let colleagues: [TrainingColleagueModel]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()
                if colleagues.isEmpty {
                    Text("لا يوجد زملاء آخرون في هذا الدوران")
                        .foregroundColor(MiranTheme.subtext)
                } else {
                    List(colleagues) { colleague in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(colleague.nameAr).font(.subheadline.bold()).foregroundColor(.white)
                            Text("\(colleague.specialty ?? "") · \(colleague.departmentNameAr)")
                                .font(.caption)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .listRowBackground(Color.white.opacity(0.04))
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("زملائي في التدريب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("إغلاق") { dismiss() }
                }
            }
        }
    }
}

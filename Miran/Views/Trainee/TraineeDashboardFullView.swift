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

    @State private var showNewCaseSheet = false
    @State private var showDigitalIDSheet = false

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
                                    Text("برنامج الامتياز — مستشفى برج الشمال الطبي")
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
                                Text("نشط الان 🟢")
                                    .font(.caption2.bold())
                                    .foregroundColor(MiranTheme.emerald)
                            }

                            HStack(spacing: 16) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("القسم السريري:")
                                        .font(.caption)
                                        .foregroundColor(MiranTheme.subtext)
                                    Text("قسم الباطنة العامة")
                                        .font(.subheadline.bold())
                                        .foregroundColor(.white)
                                }

                                Spacer()

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("المدرب المباشر:")
                                        .font(.caption)
                                        .foregroundColor(MiranTheme.subtext)
                                    Text("د. سالم العتيبي")
                                        .font(.subheadline.bold())
                                        .foregroundColor(MiranTheme.emerald)
                                }
                            }

                            Divider().background(Color.white.opacity(0.1))

                            HStack {
                                Text("الساعات المكتسبة: 140 / 160 ساعة")
                                    .font(.caption.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Text("التقدم: ٨٨٪")
                                    .font(.caption.monospaced())
                                    .foregroundColor(MiranTheme.teal)
                            }
                            ProgressView(value: 0.88)
                                .tint(MiranTheme.emerald)
                        }
                        .padding()
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(16)
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
                DigitalIDCardView(profile: nil)
            }
            .sheet(isPresented: $showNewCaseSheet) {
                CreateClinicalCaseSheet {
                    // Refresh action
                }
            }
        }
    }
}

//
//  TraineeTabView.swift
//  Miran
//
//  SwiftUI Trainee Tab View connected to Miran REST APIs (Async/Await & TraineeViewModel).
//

import SwiftUI

struct TraineeTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = TraineeViewModel()
    @State private var showOrgPicker = false

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Header Org Context Bar
                        HStack {
                            Button {
                                showOrgPicker = true
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "building.2.fill")
                                        .foregroundColor(MiranTheme.emerald)
                                    Text(authViewModel.currentUser?.activeOrganization.nameAr ?? "الجهة الحالية")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundColor(.white)
                                    Image(systemName: "chevron.down")
                                        .font(.caption)
                                        .foregroundColor(MiranTheme.subtext)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(MiranTheme.emerald.opacity(0.12))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(MiranTheme.emerald.opacity(0.3), lineWidth: 1)
                                )
                            }

                            Spacer()

                            Button {
                                authViewModel.logout()
                            } label: {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .foregroundColor(.red)
                            }
                        }
                        .padding(.horizontal)

                        // Digital ID Card
                        DigitalIDCardView(profile: viewModel.traineeProfile)

                        // ─── نداء وارد (Incoming Call) — للمتدرب فقط ────────────
                        // RBAC: المتدرب يرى هذا القسم فقط (استقبال النداء لا إطلاقه)
                        if let call = viewModel.activeCall {
                            VStack(alignment: .leading, spacing: 14) {
                                // رأس النداء
                                HStack {
                                    ZStack {
                                        Circle()
                                            .fill(Color.red.opacity(0.2))
                                            .frame(width: 44, height: 44)
                                        Image(systemName: "bell.and.waves.left.and.right.fill")
                                            .font(.title3)
                                            .foregroundColor(.red)
                                    }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("نداء سريري وارد")
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(Color.red)
                                        Text(call.customTitle ?? "استدعاء عاجل")
                                            .font(.headline.weight(.bold))
                                            .foregroundColor(.white)
                                    }
                                    Spacer()
                                    // مؤشر وميض
                                    Circle()
                                        .fill(Color.red)
                                        .frame(width: 10, height: 10)
                                }

                                if let note = call.note, !note.isEmpty {
                                    Text(note)
                                        .font(.subheadline)
                                        .foregroundColor(MiranTheme.subtext)
                                }

                                if let location = call.location, !location.isEmpty {
                                    Label(location, systemImage: "mappin.circle.fill")
                                        .font(.caption)
                                        .foregroundColor(MiranTheme.emerald)
                                }

                                // ─── الأزرار الثلاثة للاستجابة ────────────────
                                VStack(spacing: 10) {
                                    // 1. تأكيد الاستلام
                                    Button {
                                        Task { await viewModel.acknowledgeCall(callId: call.id) }
                                    } label: {
                                        Label("تأكيد الاستلام", systemImage: "checkmark.circle.fill")
                                            .font(.callout.weight(.bold))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 12)
                                            .background(MiranTheme.emerald)
                                            .foregroundColor(.white)
                                            .cornerRadius(12)
                                    }

                                    HStack(spacing: 10) {
                                        // 2. أنا في الطريق
                                        Button {
                                            Task { await viewModel.onWay(callId: call.id) }
                                        } label: {
                                            Label("أنا في الطريق", systemImage: "figure.walk")
                                                .font(.caption.weight(.bold))
                                                .frame(maxWidth: .infinity)
                                                .padding(.vertical, 11)
                                                .background(Color.orange.opacity(0.85))
                                                .foregroundColor(.white)
                                                .cornerRadius(12)
                                        }

                                        // 3. وصلت
                                        Button {
                                            Task { await viewModel.confirmArrival(callId: call.id) }
                                        } label: {
                                            Label("وصلت", systemImage: "location.fill")
                                                .font(.caption.weight(.bold))
                                                .frame(maxWidth: .infinity)
                                                .padding(.vertical, 11)
                                                .background(MiranTheme.accent)
                                                .foregroundColor(.white)
                                                .cornerRadius(12)
                                        }
                                    }
                                }
                            }
                            .padding(16)
                            .background(
                                LinearGradient(colors: [Color.red.opacity(0.12), Color.red.opacity(0.05)],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
                            )
                            .cornerRadius(20)
                            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.red.opacity(0.4), lineWidth: 1.5))
                            .padding(.horizontal)
                        }

                        // My Active Rotations Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("الروتيشنات والدورات الحالية")
                                .font(.headline.weight(.bold))
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            if viewModel.rotations.isEmpty {
                                Text("لا توجد روتيشنات مسجلة حالياً")
                                    .font(.subheadline)
                                    .foregroundColor(MiranTheme.subtext)
                                    .padding()
                            } else {
                                ForEach(viewModel.rotations) { rot in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(rot.department?.nameAr ?? "قسم الجراحة")
                                                .font(.body.weight(.bold))
                                                .foregroundColor(.white)
                                            Text("من: \(rot.startDate) — إلى: \(rot.endDate)")
                                                .font(.caption)
                                                .foregroundColor(MiranTheme.subtext)
                                        }
                                        Spacer()
                                        Text(rot.status)
                                            .font(.caption.weight(.bold))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 4)
                                            .background(MiranTheme.emerald.opacity(0.2))
                                            .foregroundColor(MiranTheme.emerald)
                                            .cornerRadius(8)
                                    }
                                    .padding()
                                    .background(Color.white.opacity(0.04))
                                    .cornerRadius(14)
                                    .padding(.horizontal)
                                }
                            }
                        }
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    await viewModel.fetchDashboardData()
                }
            }
            .navigationTitle("رحلة المتدرب")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showOrgPicker) {
                OrgSwitcherSheet()
            }
            .task {
                await viewModel.fetchDashboardData()
            }
        }
    }
}

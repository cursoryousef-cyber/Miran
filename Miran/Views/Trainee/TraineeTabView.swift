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

                        // Active Call Alert (If Any)
                        if let call = viewModel.activeCall {
                            VStack(spacing: 12) {
                                HStack {
                                    Image(systemName: "bolt.heart.fill")
                                        .font(.title2)
                                        .foregroundColor(.amber)
                                    Text("نداء استدعاء سريري جديد (Call Launch)")
                                        .font(.headline.weight(.bold))
                                        .foregroundColor(.white)
                                    Spacer()
                                }

                                Text(call.note ?? "مطلوب حضورك الفوري لغرفة العمليات")
                                    .font(.subheadline)
                                    .foregroundColor(MiranTheme.subtext)
                                    .frame(maxWidth: .infinity, alignment: .leading)

                                HStack(spacing: 12) {
                                    Button {
                                        Task {
                                            await viewModel.acknowledgeCall(callId: call.id)
                                        }
                                    } label: {
                                        Text("استلام وتأكيد (Ack)")
                                            .font(.caption.weight(.bold))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(MiranTheme.emerald)
                                            .foregroundColor(.white)
                                            .cornerRadius(10)
                                    }

                                    Button {
                                        Task {
                                            await viewModel.confirmArrival(callId: call.id)
                                        }
                                    } label: {
                                        Text("وصلت للموقع (Self Arrive)")
                                            .font(.caption.weight(.bold))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(MiranTheme.accent)
                                            .foregroundColor(.white)
                                            .cornerRadius(10)
                                    }
                                }
                            }
                            .padding()
                            .background(Color.amber.opacity(0.12))
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.amber.opacity(0.4), lineWidth: 1)
                            )
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

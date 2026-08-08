//
//  ScheduleView.swift
//  مِران
//
//  جدول الروتيشنات — مبني على TraineeViewModel (GET /rotations/my)، لا بيانات وهمية.
//

import SwiftUI

struct ScheduleView: View {
    @StateObject private var vm = TraineeViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.rotations.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.rotations.isEmpty {
                    EmptyStateView(icon: "calendar.badge.exclamationmark",
                                   title: "لا يوجد جدول بعد",
                                   message: "سيظهر جدول الروتيشنات فور تفعيل تدريبك.")
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(vm.rotations) { rot in
                                rotationRow(rot)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 24)
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("جدولي")
            .task { await vm.fetchDashboardData() }
            .refreshable { await vm.fetchDashboardData() }
        }
    }

    @ViewBuilder
    private func rotationRow(_ rot: RotationModel) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(rot.department?.nameAr ?? "—").font(.headline)
                Spacer()
                if rot.status == "active" {
                    MiranBadge("جارٍ الآن", color: MiranTheme.green, icon: "play.fill")
                } else if rot.status == "completed" {
                    MiranBadge("منتهٍ", color: .gray)
                } else {
                    MiranBadge(rot.status, color: .orange)
                }
            }

            InfoRow(label: "المدرب", value: rot.trainerProfile?.person?.nameAr ?? "—", icon: "person.text.rectangle")
            InfoRow(label: "من", value: String(rot.startDate.prefix(10)), icon: "calendar")
            InfoRow(label: "إلى", value: String(rot.endDate.prefix(10)), icon: "calendar.badge.checkmark")

            if rot.status == "active" {
                HStack {
                    if rot.midpointMeetingDone {
                        MiranBadge("اجتماع المنتصف تم", color: MiranTheme.green, icon: "checkmark")
                    } else {
                        MiranBadge("اجتماع المنتصف مطلوب", color: .orange, icon: "exclamationmark")
                    }
                    Spacer()
                }
            }
        }
        .miranCard(tint: rot.status == "active" ? MiranTheme.accent : .clear)
    }
}

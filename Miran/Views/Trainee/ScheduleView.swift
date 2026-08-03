//
//  ScheduleView.swift
//  مِران
//
//  الجدول والروتيشنات والورديات.
//

import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject var store: AppStore
    @State private var tab = 0

    private var trainee: Trainee? { store.currentTrainee }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $tab) {
                    Text("الورديات").tag(0)
                    Text("الروتيشنات").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                if tab == 0 { shiftsList } else { rotationsList }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("جدولي")
        }
    }

    private var shiftsList: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                if let t = trainee {
                    let upcoming = store.traineeShifts(for: t.id).filter {
                        $0.date >= Calendar.current.startOfDay(for: Date())
                    }
                    ForEach(upcoming) { shift in
                        shiftRow(shift)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
    }

    @ViewBuilder
    private func shiftRow(_ shift: Shift) -> some View {
        HStack(spacing: 12) {
            VStack(spacing: 2) {
                Text(Fmt.weekday(shift.date)).font(.caption2).foregroundStyle(.secondary)
                Text(Fmt.shortDate(shift.date)).font(.subheadline).bold()
            }
            .frame(width: 72)

            Rectangle()
                .fill(shift.type.color)
                .frame(width: 4)
                .clipShape(Capsule())

            VStack(alignment: .leading, spacing: 3) {
                Text(shift.type.title).font(.subheadline).bold()
                Text(shift.type.hours).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()

            if Calendar.current.isDateInToday(shift.date) {
                MiranBadge("اليوم", color: MiranTheme.accent)
            }
            if !shift.type.isReachable {
                Image(systemName: "bell.slash").foregroundStyle(.tertiary)
            }
        }
        .miranCard()
    }

    private var rotationsList: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if let t = trainee {
                    ForEach(store.traineeRotations(for: t.id)) { rot in
                        rotationRow(rot)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
    }

    @ViewBuilder
    private func rotationRow(_ rot: Rotation) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(store.department(rot.departmentID)?.name ?? "—")
                    .font(.headline)
                Spacer()
                if rot.isCurrent {
                    MiranBadge("جارٍ الآن", color: MiranTheme.green, icon: "play.fill")
                } else if rot.startDate > Date() {
                    MiranBadge("قادم", color: .orange, icon: "clock")
                } else {
                    MiranBadge("منتهٍ", color: .gray)
                }
            }

            InfoRow(label: "المدرب الأساس",
                    value: store.trainer(rot.trainerID)?.nameAr ?? "—",
                    icon: "person.text.rectangle")
            InfoRow(label: "من",
                    value: Fmt.date(rot.startDate), icon: "calendar")
            InfoRow(label: "إلى",
                    value: Fmt.date(rot.endDate), icon: "calendar.badge.checkmark")

            if rot.isCurrent {
                MiranProgressBar(value: rot.progress)
                HStack {
                    Text("متبقٍ \(rot.daysRemaining) يوماً")
                        .font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    if rot.midpointMeetingDone {
                        MiranBadge("اجتماع المنتصف تم", color: MiranTheme.green, icon: "checkmark")
                    } else if rot.progress > 0.4 {
                        MiranBadge("اجتماع المنتصف مطلوب", color: .orange, icon: "exclamationmark")
                    }
                }
            }
        }
        .miranCard(tint: rot.isCurrent ? MiranTheme.accent : .clear)
    }
}

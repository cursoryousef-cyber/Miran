//
//  TodayView.swift
//  مِران
//
//  شاشة «اليوم» — الشاشة الافتراضية. سطر واحد يجيب: ماذا أفعل الآن؟
//

import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: AppStore
    @State private var showCheckInConfirm = false

    private var trainee: Trainee? { store.currentTrainee }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let t = trainee {
                        headerCard(t)
                        currentPlaceCard(t)
                        attendanceCard(t)
                        nextEventCard(t)
                        objectivesCard(t)
                        diligenceCard(t)
                        callHistoryCard(t)
                    } else {
                        EmptyStateView(icon: "person.slash",
                                       title: "لا يوجد متدرب محدد",
                                       message: "اختر متدرباً من شاشة الدخول.")
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("اليوم")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("خروج") { store.role = nil }
                }
            }
        }
    }

    // MARK: أقسام الشاشة

    private func headerCard(_ t: Trainee) -> some View {
        HStack(spacing: 12) {
            TraineeAvatar(trainee: t, size: 54)
            VStack(alignment: .leading, spacing: 3) {
                Text(t.nameAr).font(.headline)
                Text("\(t.level.title) • \(t.specialty)")
                    .font(.caption).foregroundStyle(.secondary)
                MiranBadge(t.cardStatus.title, color: t.cardStatus.color, icon: "checkmark.shield.fill")
            }
            Spacer()
        }
        .miranCard()
    }

    private func currentPlaceCard(_ t: Trainee) -> some View {
        let rotation = store.currentRotation(for: t.id)
        let dept = store.department(rotation?.departmentID)
        let trainer = store.trainer(rotation?.trainerID)
        let shift = store.todayShift(for: t.id)

        return VStack(alignment: .leading, spacing: 12) {
            SectionTitle("أين أنت الآن", systemImage: "location.fill")

            if let dept {
                InfoRow(label: "القسم", value: dept.name, icon: "building.2")
                InfoRow(label: "المسؤول", value: trainer?.nameAr ?? "—", icon: "person.text.rectangle")
                InfoRow(label: "التحويلة", value: trainer?.extensionNumber ?? "—", icon: "phone")
            }

            if let shift {
                InfoRow(label: "ورديتك اليوم", value: "\(shift.type.title) — \(shift.type.hours)", icon: "clock")
            }

            if let rotation {
                Divider()
                HStack {
                    Text("متبقٍ على نهاية الروتيشن")
                        .font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Text("\(rotation.daysRemaining) يوماً").font(.caption).bold()
                }
                MiranProgressBar(progress: rotation.progress)
            }
        }
        .miranCard(tint: MiranTheme.accent)
    }

    private func attendanceCard(_ t: Trainee) -> some View {
        let record = store.todayAttendance(for: t.id)
        let shift = store.todayShift(for: t.id)

        return VStack(alignment: .leading, spacing: 12) {
            SectionTitle("الحضور", systemImage: "checkmark.circle")

            if shift?.type == .leave {
                Text("أنت في إجازة اليوم — لا يصلك نداء.")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else if let record, record.checkIn != nil {
                InfoRow(label: "تسجيل الدخول", value: Fmt.time(record.checkIn!), icon: "arrow.right.to.line")
                if let out = record.checkOut {
                    InfoRow(label: "تسجيل الخروج", value: Fmt.time(out), icon: "arrow.left.to.line")
                } else {
                    Button {
                        store.checkOut(t.id)
                    } label: {
                        Label("تسجيل الانصراف", systemImage: "arrow.left.to.line")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            } else {
                Text("لم تسجّل حضورك اليوم بعد.")
                    .font(.subheadline).foregroundStyle(.secondary)
                Button {
                    store.checkIn(t.id, method: "نطاق جغرافي")
                } label: {
                    Label("تسجيل الحضور تلقائياً", systemImage: "location.fill.viewfinder")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .miranCard()
    }

    private func nextEventCard(_ t: Trainee) -> some View {
        let dept = store.department(store.currentRotation(for: t.id)?.departmentID)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle("الحدث القادم", systemImage: "arrow.forward.circle")
            InfoRow(label: "الراوند", value: dept?.roundTime ?? "—", icon: "figure.walk.motion")
            InfoRow(label: "المكان", value: dept?.roundLocation ?? "—", icon: "mappin.and.ellipse")
            InfoRow(label: "غرفة الاجتماعات", value: dept?.meetingRoom ?? "—", icon: "door.left.hand.open")
        }
        .miranCard()
    }

    private func objectivesCard(_ t: Trainee) -> some View {
        let rotation = store.currentRotation(for: t.id)
        let dept = store.department(rotation?.departmentID)
        let total = dept?.objectives.count ?? 0
        let done = rotation?.completedObjectives.count ?? 0

        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle("الأهداف التعليمية", systemImage: "target")
            HStack {
                Text("\(done) من \(total) مكتملة").font(.subheadline)
                Spacer()
                MiranBadge(total == 0 ? "—" : Fmt.percent(Double(done) / Double(max(1, total))),
                           color: done * 2 >= total ? MiranTheme.green : .orange)
            }
            MiranProgressBar(value: total == 0 ? 0 : Double(done) / Double(total),
                             color: done * 2 >= total ? MiranTheme.green : .orange)

            if let rotation, rotation.progress > 0.5, done * 2 < total {
                Text("تنبيه: تجاوزت منتصف الدورة ولم تكمل نصف الأهداف.")
                    .font(.caption).foregroundStyle(.orange)
            }
        }
        .miranCard()
    }

    private func diligenceCard(_ t: Trainee) -> some View {
        let d = store.diligence(for: t.id)
        return VStack(alignment: .leading, spacing: 12) {
            SectionTitle("مؤشر حرصك", systemImage: "bolt.heart")
            HStack(spacing: 18) {
                ScoreDial(score: Double(d.value), label: d.label, color: d.color, size: 96)
                VStack(alignment: .leading, spacing: 8) {
                    InfoRow(label: "نسبة الاستجابة", value: Fmt.percent(d.responseRate))
                    InfoRow(label: "متوسط الإقرار",
                            value: d.averageAckSeconds.map { Fmt.duration($0) } ?? "—")
                    InfoRow(label: "متوسط الوصول",
                            value: d.averageArrivalSeconds.map { Fmt.duration($0) } ?? "—")
                    InfoRow(label: "عدد النداءات", value: "\(d.totalCalls)")
                }
            }
            Text("هذا المؤشر خاص بك — تقارن نفسك بنفسك، ولا يُعرض لزملائك.")
                .font(.caption2).foregroundStyle(.tertiary)
        }
        .miranCard()
    }

    private func callHistoryCard(_ t: Trainee) -> some View {
        let history = store.traineeCalls(involving: t.id).prefix(5)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle("آخر النداءات", systemImage: "bell.badge")
            if history.isEmpty {
                Text("لا توجد نداءات بعد.").font(.subheadline).foregroundStyle(.secondary)
            } else {
                ForEach(Array(history)) { call in
                    if let p = call.participants.first(where: { $0.traineeID == t.id }) {
                        HStack {
                            Image(systemName: call.type.icon).foregroundStyle(call.type.color)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(call.displayTitle).font(.subheadline).bold()
                                Text(Fmt.shortDate(call.launchedAt)).font(.caption2).foregroundStyle(.secondary)
                            }
                            Spacer()
                            MiranBadge(p.state.title, color: p.state.color, icon: p.state.icon)
                        }
                        .padding(.vertical, 3)
                    }
                }
            }
        }
        .miranCard()
    }
}

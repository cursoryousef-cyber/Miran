//
//  CallCenterView.swift
//  مِران
//
//  الوحدة ٦ — أيقونة النداء ولوحة القياس الحية.
//

import SwiftUI

struct CallCenterView: View {
    @EnvironmentObject var store: AppStore
    @State private var showLauncher = false
    @State private var openCallID: UUID?

    private var trainer: Trainer? { store.currentTrainer }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {

                    // أيقونة النداء الكبيرة
                    Button {
                        showLauncher = true
                    } label: {
                        VStack(spacing: 10) {
                            Image(systemName: "bell.badge.fill")
                                .font(.system(size: 42))
                            Text("إطلاق نداء").font(.title3).bold()
                            Text("زر واحد — يقيس من يستجيب ومن يحضر فعلاً")
                                .font(.caption)
                                .opacity(0.9)
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 26)
                        .background(
                            LinearGradient(colors: [MiranTheme.accent, MiranTheme.accentLight],
                                           startPoint: .topLeading, endPoint: .bottomTrailing),
                            in: RoundedRectangle(cornerRadius: 18)
                        )
                    }
                    .buttonStyle(.plain)

                    // النداءات النشطة
                    if let tr = trainer {
                        let active = store.trainerCalls(by: tr.id).filter(\.isActive)
                        if !active.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionTitle("نداءات جارية", systemImage: "dot.radiowaves.left.and.right")
                                ForEach(active) { call in
                                    Button {
                                        openCallID = call.id
                                    } label: {
                                        callRow(call, live: true)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .miranCard(tint: MiranTheme.green)
                        }

                        // السجل
                        let past = store.trainerCalls(by: tr.id).filter { !$0.isActive }
                        VStack(alignment: .leading, spacing: 10) {
                            SectionTitle("سجل النداءات", systemImage: "clock.arrow.circlepath")
                            if past.isEmpty {
                                Text("لا توجد نداءات سابقة.").font(.caption).foregroundStyle(.secondary)
                            } else {
                                ForEach(past) { call in
                                    Button {
                                        openCallID = call.id
                                    } label: {
                                        callRow(call, live: false)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .miranCard()
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("النداء")
            .sheet(isPresented: $showLauncher) {
                CallLauncherView { newCallID in
                    showLauncher = false
                    // تأخير بسيط لتفادي تعارض عرض شاشتين متتاليتين
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                        openCallID = newCallID
                    }
                }
            }
            .sheet(item: openCallWrapper) { wrapper in
                LiveCallBoardView(callID: wrapper.id)
            }
        }
    }

    private func callRow(_ call: TrainerCall, live: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: call.type.icon)
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(call.type.color, in: Circle())

            VStack(alignment: .leading, spacing: 3) {
                Text(call.displayTitle).font(.subheadline).bold()
                Text("\(call.location) • \(Fmt.shortDate(call.launchedAt))")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                if live {
                    LiveTimerText(since: call.launchedAt, now: store.now)
                        .font(.caption).bold().foregroundStyle(MiranTheme.green)
                } else if let avg = call.averageAckSeconds {
                    Text(Fmt.duration(avg)).font(.caption).bold()
                }
                Text("\(call.arrivedCount)/\(call.participants.count) حضور")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Image(systemName: "chevron.left").foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }

    private var openCallWrapper: Binding<IDWrapper?> {
        Binding(
            get: { openCallID.map { IDWrapper(id: $0) } },
            set: { openCallID = $0?.id }
        )
    }
}

// غلاف بسيط لاستخدام sheet(item:)
struct IDWrapper: Identifiable {
    let id: UUID
}

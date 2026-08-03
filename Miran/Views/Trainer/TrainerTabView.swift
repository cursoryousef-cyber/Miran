//
//  TrainerTabView.swift
//  Miran
//
//  SwiftUI Trainer Tab View connected to Miran REST APIs (Async/Await & TrainerViewModel).
//

import SwiftUI

struct TrainerTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = TrainerViewModel()
    @State private var showLaunchSheet = false
    @State private var callType = "emergency"
    @State private var note = ""
    @State private var location = "غرفة العمليات الرئيسية - الدور الثالث"
    @State private var expectedMinutes = 15

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Quick Call Launch Banner
                        VStack(spacing: 16) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("نظام النداء السريع للأنشطة السريرية")
                                        .font(.headline.weight(.bold))
                                        .foregroundColor(.white)
                                    Text("إطلاق نداء مباشر لجميع المتدربين التابعين لقسمك")
                                        .font(.caption)
                                        .foregroundColor(MiranTheme.subtext)
                                }
                                Spacer()
                                Image(systemName: "bolt.heart.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(MiranTheme.emerald)
                            }

                            Button {
                                showLaunchSheet = true
                            } label: {
                                HStack {
                                    Image(systemName: "megaphone.fill")
                                    Text("إطلاق نداء الآن (Launch Call)")
                                        .font(.headline.weight(.bold))
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(LinearGradient(
                                    colors: [MiranTheme.emerald, MiranTheme.teal],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ))
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .shadow(color: MiranTheme.emerald.opacity(0.4), radius: 10, y: 4)
                            }
                        }
                        .padding()
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(MiranTheme.emerald.opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal)

                        // Active Calls Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("النداءات النشطة حالياً")
                                .font(.headline.weight(.bold))
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            if viewModel.activeCalls.isEmpty {
                                Text("لا توجد نداءات قائمة حالياً")
                                    .font(.subheadline)
                                    .foregroundColor(MiranTheme.subtext)
                                    .padding()
                            } else {
                                ForEach(viewModel.activeCalls) { call in
                                    VStack(alignment: .leading, spacing: 8) {
                                        HStack {
                                            Text(call.customTitle ?? "نداء استدعاء طوارئ")
                                                .font(.body.weight(.bold))
                                                .foregroundColor(.white)
                                            Spacer()
                                            Text(call.status)
                                                .font(.caption.weight(.bold))
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(Color.amber.opacity(0.2))
                                                .foregroundColor(.amber)
                                                .cornerRadius(6)
                                        }

                                        Text(call.note ?? "")
                                            .font(.caption)
                                            .foregroundColor(MiranTheme.subtext)

                                        HStack {
                                            Label(call.location ?? "العمليات", systemImage: "mappin.circle.fill")
                                                .font(.caption2)
                                                .foregroundColor(MiranTheme.subtext)
                                            Spacer()
                                            Text("توقيت الإطلاق: \(call.launchedAt)")
                                                .font(.caption2)
                                                .foregroundColor(MiranTheme.subtext)
                                        }
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
                    await viewModel.fetchTrainerData()
                }
            }
            .navigationTitle("لوحة الاستشاري والمدرب")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showLaunchSheet) {
                NavigationView {
                    Form {
                        Section("تفاصيل النداء السريع") {
                            Picker("نوع النداء", selection: $callType) {
                                Text("استدعاء طوارئ سريرية").tag("emergency")
                                Text("مرور سريري (Round)").tag("round")
                                Text("محاضرة تعليمية (Journal Club)").tag("lecture")
                            }

                            TextField("ملاحظة أو تخصص المطلوب", text: $note)
                            TextField("الموقع / غرفة العمليات", text: $location)
                            Stepper("الوقت المتوقع للاستجابة: \(expectedMinutes) دقيقة", value: $expectedMinutes, in: 5...60, step: 5)
                        }
                    }
                    .navigationTitle("إطلاق نداء للقسم")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("إلغاء") { showLaunchSheet = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("إطلاق الآن") {
                                Task {
                                    let success = await viewModel.launchCall(
                                        callType: callType,
                                        customTitle: "نداء استدعاء سريري",
                                        note: note.isEmpty ? "مطلوب حضور كافة أطباء الامتياز فوراً" : note,
                                        location: location,
                                        expectedMinutes: expectedMinutes
                                    )
                                    if success {
                                        showLaunchSheet = false
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .task {
                await viewModel.fetchTrainerData()
            }
        }
    }
}

//
//  TrainerDashboardFullView.swift
//  Miran
//
//  Dedicated Clinical Dashboard Interface for Field Trainers (استشاري / أخصائي / مدرب).
//  Excludes General Admin screens. Focuses on Assigned Trainees, Tasks, Competencies Sign-off, and Emergency Calls.
//

import SwiftUI

struct TrainerDashboardFullView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore

    @State private var showTaskModal = false
    @State private var showLaunchCallModal = false

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Trainer Header
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("المدرب الميداني (Clinical Trainer)")
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "stethoscope.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                            Text("قسم الباطنة العامة — مستشفى برج الشمال الطبي")
                                .font(.subheadline)
                                .foregroundColor(MiranTheme.subtext)
                        }
                        .padding(.horizontal)

                        // Action Quick Controls
                        HStack(spacing: 12) {
                            Button {
                                showLaunchCallModal = true
                            } label: {
                                HStack {
                                    Image(systemName: "bell.and.waves.left.and.right.fill")
                                    Text("إطلاق نداء طوارئ M-CALL")
                                        .font(.caption.bold())
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }

                            Button {
                                showTaskModal = true
                            } label: {
                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                    Text("إسناد مهمة جديدة")
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

                        // Assigned Trainees Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("المتدربين المسندين إليك اليوم (\(store.trainees.count))")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(store.trainees, id: \.id) { trn in
                                        VStack(alignment: .leading, spacing: 6) {
                                            HStack {
                                                Image(systemName: "person.crop.circle.fill")
                                                    .foregroundColor(MiranTheme.emerald)
                                                Text(trn.nameAr)
                                                    .font(.caption.bold())
                                                    .foregroundColor(.white)
                                            }
                                            Text(trn.level.title)
                                                .font(.caption2)
                                                .foregroundColor(MiranTheme.subtext)

                                            ProgressView(value: 0.85)
                                                .tint(MiranTheme.emerald)
                                            Text("نسبة الإنجاز: ٨٥٪")
                                                .font(.caption2.bold())
                                                .foregroundColor(MiranTheme.teal)
                                        }
                                        .padding()
                                        .frame(width: 170)
                                        .background(Color.white.opacity(0.04))
                                        .cornerRadius(12)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }

                        // Pending Sign-off Tasks
                        VStack(alignment: .leading, spacing: 12) {
                            Text("المهارات والإجراءات بانتظار الاعتماد")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            NavigationLink(destination: ClinicalLogbookManagementFullView()) {
                                AdminActionRow(title: "اعتماد مهارات Logbook وحالات المتدربين", subtitle: "مراجعة حالات الباطنة وطب الطوارئ المعلقة", icon: "checkmark.seal.fill", color: MiranTheme.emerald)
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("المدرب السريري")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { authViewModel.logout() } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
            .sheet(isPresented: $showLaunchCallModal) {
                CallLauncherView(onLaunched: { _ in
                    showLaunchCallModal = false
                })
            }
            .sheet(isPresented: $showTaskModal) {
                CreateTaskSheet()
            }
        }
    }
}

// MARK: - Create Task Modal
struct CreateTaskSheet: View {
    @Environment(\.dismiss) var dismiss
    @State private var taskTitle = ""
    @State private var taskDetails = ""
    @State private var dueDate = Date()

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background.ignoresSafeArea()

                VStack(spacing: 14) {
                    TextField("عنوان المهمة السريرية", text: $taskTitle)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(10)
                        .foregroundColor(.white)

                    TextField("تفاصيل والـ Competencies المطلوبة", text: $taskDetails)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(10)
                        .foregroundColor(.white)

                    DatePicker("تاريخ التسليم", selection: $dueDate, displayedComponents: .date)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(10)
                        .foregroundColor(.white)

                    Button {
                        dismiss()
                    } label: {
                        Text("حفظ وإسناد المهمة للمتدربين")
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
            .navigationTitle("إسناد مهمة جديدة")
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

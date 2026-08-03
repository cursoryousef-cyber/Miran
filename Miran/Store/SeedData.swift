//
//  SeedData.swift
//  مِران
//
//  بيانات تجريبية لتشغيل النظام بلا خادم.
//  عند الربط الحقيقي يُحذف هذا الملف بالكامل.
//

import Foundation

extension AppStore {

    func seed() {
        let cal = Calendar.current
        let today = Date()

        // MARK: الأقسام

        let internalMedID = UUID()
        let surgeryID = UUID()
        let emergencyID = UUID()

        let internalMedicine = Department(
            id: internalMedID,
            name: "الباطنية",
            capacity: 12,
            roundLocation: "الدور الثالث — جناح باطنية رجال",
            roundTime: "08:00 يومياً",
            meetingRoom: "غرفة الاجتماعات ٣ب",
            objectives: [
                "أخذ تاريخ مرضي كامل وعرضه في الراوند",
                "قراءة تخطيط القلب الأساسي وتمييز الحالات الحرجة",
                "إدارة السكري في المريض المنوّم",
                "التعامل مع اضطرابات الأملاح الشائعة",
                "كتابة ملخص خروج مكتمل",
                "متابعة مريض فشل قلب من الدخول للخروج"
            ],
            commonMistakes: [
                "عدم مراجعة قائمة الأدوية عند الدخول",
                "طلب تحاليل بلا مؤشر سريري واضح",
                "إهمال توثيق تغييرات الخطة العلاجية",
                "تأخير إبلاغ المسؤول عن تدهور العلامات الحيوية",
                "الاعتماد على الملخص الشفهي دون تسليم مكتوب",
                "عدم مراجعة نتائج الزراعات في وقتها",
                "الخروج من الوردية قبل إتمام التسليم"
            ],
            firstDayExpectations: "الحضور الساعة ٧:٣٠ لمقابلة المدرب الأساس، استلام قائمة المرضى، حضور الراوند، ثم جلسة تعريف بالقسم في غرفة الاجتماعات ٣ب.",
            privileges: [
                ClinicalPrivilege(title: "أخذ التاريخ المرضي والفحص السريري", level: .independent),
                ClinicalPrivilege(title: "سحب الدم الوريدي", level: .independent),
                ClinicalPrivilege(title: "تركيب كانيولا محيطية", level: .independent),
                ClinicalPrivilege(title: "القسطرة البولية", level: .supervised),
                ClinicalPrivilege(title: "كتابة الأوامر الطبية للتوقيع", level: .supervised),
                ClinicalPrivilege(title: "بزل الجنب أو البطن", level: .supervised),
                ClinicalPrivilege(title: "توقيع أوامر دوائية مستقلة", level: .prohibited),
                ClinicalPrivilege(title: "إصدار قرار الخروج", level: .prohibited)
            ]
        )

        let surgery = Department(
            id: surgeryID,
            name: "الجراحة",
            capacity: 10,
            roundLocation: "الدور الرابع — جناح الجراحة",
            roundTime: "06:30 يومياً",
            meetingRoom: "قاعة الجراحة التعليمية",
            objectives: [
                "التقييم قبل العملية وتحضير المريض",
                "العناية بالجرح ومتابعة المضاعفات",
                "الخياطة السطحية تحت الإشراف",
                "التعرف على علامات البطن الحاد",
                "متابعة المريض بعد العملية"
            ],
            commonMistakes: [
                "التأخر عن راوند الصباح",
                "عدم فحص الجرح قبل تقرير الحالة",
                "إهمال تسجيل كمية السوائل والمصارف",
                "عدم إبلاغ الاستشاري بتغير حالة المريض",
                "الدخول لغرفة العمليات دون تعقيم صحيح"
            ],
            firstDayExpectations: "الحضور الساعة ٦:١٥ لراوند الصباح، ثم التعريف بغرفة العمليات وقواعد التعقيم.",
            privileges: [
                ClinicalPrivilege(title: "تقييم الجرح وتغيير الضماد", level: .independent),
                ClinicalPrivilege(title: "أخذ التاريخ والفحص", level: .independent),
                ClinicalPrivilege(title: "الخياطة السطحية", level: .supervised),
                ClinicalPrivilege(title: "المساعدة في غرفة العمليات", level: .supervised),
                ClinicalPrivilege(title: "إجراء أي عملية منفرداً", level: .prohibited)
            ]
        )

        let emergency = Department(
            id: emergencyID,
            name: "الطوارئ",
            capacity: 14,
            roundLocation: "منطقة الفرز — المدخل الرئيسي",
            roundTime: "تسليم الورديات ٧:٠٠ و١٥:٠٠ و٢٣:٠٠",
            meetingRoom: "غرفة التسليم بجوار الفرز",
            objectives: [
                "إجراء الفرز حسب مستويات الخطورة",
                "التعامل الأولي مع ألم الصدر",
                "إدارة مجرى الهواء الأساسي",
                "تقييم الإصابات وترتيب الأولويات",
                "التوثيق السريع والدقيق"
            ],
            commonMistakes: [
                "تأخير تخطيط القلب في ألم الصدر",
                "إغفال العلامات الحيوية عند إعادة التقييم",
                "عدم إبلاغ المسؤول عن الحالات الحرجة",
                "التوثيق بعد نهاية الوردية",
                "ترك المريض دون إعادة تقييم بعد العلاج"
            ],
            firstDayExpectations: "الحضور قبل الوردية بربع ساعة لحضور التسليم، والتعرف على مواقع عربة الإنعاش وغرفة الإنعاش.",
            privileges: [
                ClinicalPrivilege(title: "الفرز الأولي تحت الإشراف", level: .supervised),
                ClinicalPrivilege(title: "أخذ التاريخ والفحص", level: .independent),
                ClinicalPrivilege(title: "تخطيط القلب وتسجيله", level: .independent),
                ClinicalPrivilege(title: "إعطاء الأدوية الطارئة", level: .prohibited),
                ClinicalPrivilege(title: "قرار صرف المريض", level: .prohibited)
            ]
        )

        departments = [internalMedicine, surgery, emergency]

        // MARK: المدربون

        let t1 = Trainer(nameAr: "د. سالم العتيبي", title: "استشاري باطنية", departmentID: internalMedID, extensionNumber: "٤١٢٢")
        let t2 = Trainer(nameAr: "د. هند القحطاني", title: "استشاري باطنية", departmentID: internalMedID, extensionNumber: "٤١٣٠")
        let t3 = Trainer(nameAr: "د. ماجد الشمري", title: "استشاري جراحة", departmentID: surgeryID, extensionNumber: "٥٢٠٨")
        let t4 = Trainer(nameAr: "د. نورة الحربي", title: "استشاري طوارئ", departmentID: emergencyID, extensionNumber: "٦٣١٥")
        trainers = [t1, t2, t3, t4]
        currentTrainerID = t1.id

        // MARK: المستندات القياسية

        func standardDocuments(allApproved: Bool) -> [TrainingDocument] {
            let status: DocumentStatus = allApproved ? .approved : .pending
            return [
                TrainingDocument(title: "صورة الهوية أو الإقامة", isMandatory: true, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .month, value: 20, to: today), status: status),
                TrainingDocument(title: "خطاب الجهة المبتعثة", isMandatory: true, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .month, value: 11, to: today), status: status),
                TrainingDocument(title: "بطاقة التصنيف المهني", isMandatory: true, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .month, value: 8, to: today), status: status),
                TrainingDocument(title: "شهادة التخرج أو إفادة قيد", isMandatory: true, hasExpiry: false, status: status),
                TrainingDocument(title: "شهادة BLS", isMandatory: true, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .day, value: 41, to: today), status: status),
                TrainingDocument(title: "شهادة ACLS", isMandatory: false, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .month, value: 14, to: today), status: status),
                TrainingDocument(title: "سجل التطعيمات", isMandatory: true, hasExpiry: false, status: status),
                TrainingDocument(title: "تأمين المسؤولية الطبية", isMandatory: true, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .month, value: 9, to: today), status: status),
                TrainingDocument(title: "تعهد السرية وسياسة المنشأة", isMandatory: true, hasExpiry: false, status: status),
                TrainingDocument(title: "الفحص الطبي واللياقة", isMandatory: false, hasExpiry: true,
                                 expiryDate: cal.date(byAdding: .month, value: 10, to: today), status: status)
            ]
        }

        // MARK: المتدربون

        var list: [Trainee] = []

        let approvedSeed: [(String, String, String, TraineeLevel, String, UUID)] = [
            ("عبدالله ناصر المطيري", "Abdullah N. Almutairi", "١١٠٢٣", .intern, "طب بشري", t1.id),
            ("ريم فهد الدوسري", "Reem F. Aldosari", "١١٠٢٤", .intern, "طب بشري", t1.id),
            ("خالد سعود العنزي", "Khalid S. Alanazi", "١١٠٢٥", .intern, "طب بشري", t1.id),
            ("سارة محمد الرشيد", "Sara M. Alrashid", "١١٠٢٦", .intern, "طب بشري", t1.id),
            ("فيصل عبدالرحمن الحميد", "Faisal A. Alhumaid", "١١٠٢٧", .resident, "باطنية — سنة ٢", t2.id),
            ("منيرة تركي السبيعي", "Munira T. Alsubaie", "١١٠٢٨", .resident, "باطنية — سنة ١", t2.id),
            ("بندر علي الغامدي", "Bandar A. Alghamdi", "١١٠٢٩", .student, "طب — سنة ٥", t1.id),
            ("لمى صالح الزهراني", "Lama S. Alzahrani", "١١٠٣٠", .nursing, "تمريض", t4.id)
        ]

        for (ar, en, num, level, spec, trainerID) in approvedSeed {
            list.append(Trainee(
                traineeNumber: num,
                nameAr: ar,
                nameEn: en,
                nationalID: "10\(Int.random(in: 10000000...99999999))",
                level: level,
                specialty: spec,
                sponsor: "جامعة الحدود الشمالية",
                phone: "05\(Int.random(in: 10000000...99999999))",
                email: "\(num)@miran.health",
                emergencyContact: "05\(Int.random(in: 10000000...99999999))",
                applicationStatus: .approved,
                cardStatus: .active,
                accessExpiry: cal.date(byAdding: .month, value: 11, to: today) ?? today,
                trainerID: trainerID,
                currentDepartmentID: internalMedID,
                documents: standardDocuments(allApproved: true)
            ))
        }

        // ملفات قيد المراجعة لدى الشؤون الأكاديمية
        let pendingSeed: [(String, String, String, TraineeLevel, String)] = [
            ("محمد إبراهيم العتيبي", "Mohammed I. Alotaibi", "١١٠٣١", .intern, "طب بشري"),
            ("نوف عبدالله الشهري", "Nouf A. Alshehri", "١١٠٣٢", .intern, "طب بشري"),
            ("ياسر حمد القحطاني", "Yasser H. Alqahtani", "١١٠٣٣", .allied, "علاج تنفسي")
        ]

        for (ar, en, num, level, spec) in pendingSeed {
            list.append(Trainee(
                traineeNumber: num,
                nameAr: ar,
                nameEn: en,
                nationalID: "10\(Int.random(in: 10000000...99999999))",
                level: level,
                specialty: spec,
                sponsor: "جامعة الحدود الشمالية",
                phone: "05\(Int.random(in: 10000000...99999999))",
                email: "\(num)@miran.health",
                emergencyContact: "05\(Int.random(in: 10000000...99999999))",
                applicationStatus: .submitted,
                cardStatus: .notIssued,
                currentDepartmentID: nil,
                documents: standardDocuments(allApproved: false)
            ))
        }

        trainees = list
        currentTraineeID = list.first?.id

        // MARK: الروتيشنات

        var rots: [Rotation] = []
        for t in trainees where t.applicationStatus == .approved {
            let trainerID = t.trainerID ?? t1.id

            rots.append(Rotation(
                traineeID: t.id,
                departmentID: internalMedID,
                trainerID: trainerID,
                startDate: cal.date(byAdding: .day, value: -18, to: today) ?? today,
                endDate: cal.date(byAdding: .day, value: 12, to: today) ?? today,
                midpointMeetingDone: Bool.random(),
                completedObjectives: Set([0, 1, 2].prefix(Int.random(in: 0...3)))
            ))

            rots.append(Rotation(
                traineeID: t.id,
                departmentID: surgeryID,
                trainerID: t3.id,
                startDate: cal.date(byAdding: .day, value: 13, to: today) ?? today,
                endDate: cal.date(byAdding: .day, value: 43, to: today) ?? today
            ))

            rots.append(Rotation(
                traineeID: t.id,
                departmentID: emergencyID,
                trainerID: t4.id,
                startDate: cal.date(byAdding: .day, value: 44, to: today) ?? today,
                endDate: cal.date(byAdding: .day, value: 74, to: today) ?? today
            ))
        }
        rotations = rots

        // MARK: الورديات

        var sh: [Shift] = []
        for t in trainees where t.applicationStatus == .approved {
            for offset in -7...14 {
                guard let d = cal.date(byAdding: .day, value: offset, to: today) else { continue }
                let weekday = cal.component(.weekday, from: d)
                let type: ShiftType
                if weekday == 6 {
                    type = .leave
                } else if offset % 7 == 3 {
                    type = .night
                } else if offset % 5 == 2 {
                    type = .evening
                } else if offset % 9 == 4 {
                    type = .onCall
                } else {
                    type = .morning
                }
                sh.append(Shift(traineeID: t.id, date: d, type: type, departmentID: internalMedID))
            }
        }
        shifts = sh

        // MARK: الحضور

        var att: [AttendanceRecord] = []
        for t in trainees where t.applicationStatus == .approved {
            for offset in -10 ... -1 {
                guard let d = cal.date(byAdding: .day, value: offset, to: today) else { continue }
                let present = Int.random(in: 0...10) > 1
                let late = present && Int.random(in: 0...10) > 7
                att.append(AttendanceRecord(
                    traineeID: t.id,
                    date: d,
                    checkIn: present ? cal.date(bySettingHour: late ? 8 : 7, minute: late ? 25 : 45, second: 0, of: d) : nil,
                    checkOut: present ? cal.date(bySettingHour: 15, minute: 10, second: 0, of: d) : nil,
                    method: "نطاق جغرافي",
                    isLate: late
                ))
            }
        }
        attendance = att

        // MARK: نداءات سابقة مكتملة (لتغذية مؤشر الحرص)

        let approved = trainees.filter { $0.applicationStatus == .approved }
        let historyTypes: [CallType] = [.urgent, .interesting, .skill, .lecture]

        for (i, type) in historyTypes.enumerated() {
            let launched = cal.date(byAdding: .hour, value: -(6 + i * 20), to: today) ?? today
            var parts: [CallParticipant] = []

            for (j, t) in approved.enumerated() {
                var p = CallParticipant(traineeID: t.id, notifiedAt: launched)

                // نمط استجابة متفاوت لإظهار الفروق في المؤشر
                let responsive = (j + i) % 5 != 0
                if responsive {
                    let ack = Double(15 + (j * 11) % 120)
                    p.ackAt = launched.addingTimeInterval(ack)
                    p.state = .acknowledged

                    let selfArrive = ack + Double(120 + (j * 47) % 500)
                    p.selfArrivedAt = launched.addingTimeInterval(selfArrive)
                    p.state = .selfArrived

                    if type.requiresDualConfirmation {
                        p.confirmedAt = launched.addingTimeInterval(selfArrive + Double(20 + (j * 13) % 90))
                        p.state = .confirmed
                    }
                } else if (j + i) % 10 == 0 {
                    p.state = .declined
                    p.declineReason = "مع مريض في إجراء"
                }

                parts.append(p)
            }

            let call = TrainerCall(
                type: type,
                customTitle: "",
                note: type == .interesting ? "حالة نادرة في سرير ٤ — من يريد أن يراها فليأتِ" : "",
                location: "باطنية رجال — غرفة ١٢",
                expectedMinutes: type.defaultMinutes,
                trainerID: t1.id,
                departmentID: internalMedID,
                launchedAt: launched,
                endedAt: launched.addingTimeInterval(Double(type.defaultMinutes * 60)),
                participants: parts
            )
            calls.append(call)
        }

        // MARK: تقييمات سابقة

        let criteria = ["المعرفة النظرية", "المهارات السريرية", "السلوك المهني", "التواصل", "الالتزام"]
        for (i, t) in approved.enumerated() {
            guard let rot = rots.first(where: { $0.traineeID == t.id && $0.isCurrent }) else { continue }
            let base = [5, 4, 4, 3, 5, 4, 2, 4][i % 8]
            let items = criteria.map { EvaluationItem(title: $0, score: max(1, min(5, base + Int.random(in: -1...1)))) }
            evaluations.append(Evaluation(
                rotationID: rot.id,
                traineeID: t.id,
                evaluatorID: t.trainerID ?? t1.id,
                isMidpoint: true,
                items: items,
                comment: "أداء منتصف الدورة — يحتاج تركيزاً أكبر على التوثيق.",
                submittedAt: cal.date(byAdding: .day, value: -3, to: today) ?? today,
                secondsSpent: i == 2 ? 22 : Int.random(in: 90...400)
            ))
        }

        // MARK: تقييم الأقسام

        for t in approved.prefix(5) {
            guard let rot = rots.first(where: { $0.traineeID == t.id && $0.isCurrent }) else { continue }
            departmentFeedback.append(DepartmentFeedback(
                rotationID: rot.id,
                departmentID: internalMedID,
                supervisionQuality: Int.random(in: 3...5),
                learningOpportunities: Int.random(in: 3...5),
                workloadFairness: Int.random(in: 2...5),
                environment: Int.random(in: 3...5),
                comment: ""
            ))
        }
    }
}

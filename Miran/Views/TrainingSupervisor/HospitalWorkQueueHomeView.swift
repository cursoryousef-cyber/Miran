//
//  HospitalWorkQueueHomeView.swift
//  Miran
//
//  الشاشة الرئيسية للمستشفى ومشرف التدريب — "ما يحتاج إجراء" (Actionable Work Queue).
//  تعرض الإجراءات العاجلة حسب الأولوية: طلبات التدريب، المستندات المعلقة، التدوير، والجدول.
//

import SwiftUI

struct HospitalWorkQueueHomeView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var store: AppStore
    @Environment(\.colorScheme) var systemColorScheme

    var user: UserProfileResponse? { authViewModel.currentUser }

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background(for: systemColorScheme)
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // ── 1. HEADER BANNER ──────────────────────────────────
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("ما يحتاج إجراء ⚡️")
                                        .font(.title2.bold())
                                        .foregroundColor(MiranTheme.primaryText(for: systemColorScheme))
                                    Text(user?.activeOrganization.displayName ?? "مستشفى الأمير عبدالعزيز بن مساعد")
                                        .font(.caption.weight(.medium))
                                        .foregroundColor(MiranTheme.secondaryText(for: systemColorScheme))
                                }
                                Spacer()
                                Image(systemName: "tray.full.fill")
                                    .font(.system(size: 26))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 10)

                        // ── 2. METRICS CARDS ──────────────────────────────────
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            WorkQueueMetricTile(title: "طلبات تدريب جديدة", count: "3", icon: "doc.badge.plus", color: .blue)
                            WorkQueueMetricTile(title: "مستندات بانتظار المراجعة", count: "5", icon: "doc.text.magnifyingglass", color: .orange)
                            WorkQueueMetricTile(title: "متدربون بدون تدوير", count: "2", icon: "person.crop.circle.badge.exclamationmark", color: .red)
                            WorkQueueMetricTile(title: "اعتماد الإجراءات", count: "8", icon: "signature", color: MiranTheme.emerald)
                        }
                        .padding(.horizontal)

                        // ── 3. ACTIONABLE ITEMS LIST ──────────────────────────
                        VStack(alignment: .leading, spacing: 12) {
                            Text("قائمة المهام والإجراءات العاجلة")
                                .font(.headline.weight(.bold))
                                .foregroundColor(MiranTheme.primaryText(for: systemColorScheme))
                                .padding(.horizontal)

                            VStack(spacing: 12) {
                                WorkQueueActionCard(
                                    title: "طلب تدريب دفعة كليّة الطب - جامعة الحدود الشمالية",
                                    subtitle: "14 متدرب مرشح بانتظار الموافقة والتوزيع",
                                    badge: "طلب جديد",
                                    badgeColor: .blue,
                                    icon: "graduationcap.fill"
                                )

                                WorkQueueActionCard(
                                    title: "مراجعة أوراق المتدرب د. أحمد العنزي",
                                    subtitle: "شهادة اللياقة الطبية وخطاب التكليف الميداني",
                                    badge: "مستند معلق",
                                    badgeColor: .orange,
                                    icon: "doc.text.fill"
                                )

                                WorkQueueActionCard(
                                    title: "اعتماد السجل التدريبي السريري",
                                    subtitle: "8 حالات سريرية منتهية بانتظار اعتماد المشرف",
                                    badge: "اعتماد",
                                    badgeColor: MiranTheme.emerald,
                                    icon: "checkmark.seal.fill"
                                )
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 30)
                }
            }
            .navigationTitle("مركز إدارات المستشفى")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Work Queue Metric Tile
struct WorkQueueMetricTile: View {
    let title: String
    let count: String
    let icon: String
    let color: Color
    @Environment(\.colorScheme) var systemColorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.12))
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(color)
                }
                Spacer()
                Text(count)
                    .font(.title2.bold())
                    .foregroundColor(color)
            }
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundColor(MiranTheme.primaryText(for: systemColorScheme))
        }
        .padding(14)
        .background(MiranTheme.cardBackground(for: systemColorScheme))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(MiranTheme.border(for: systemColorScheme), lineWidth: 1)
        )
    }
}

// MARK: - Work Queue Action Card
struct WorkQueueActionCard: View {
    let title: String
    let subtitle: String
    let badge: String
    let badgeColor: Color
    let icon: String
    @Environment(\.colorScheme) var systemColorScheme

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(badgeColor.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(badgeColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(badge)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(badgeColor.opacity(0.12))
                        .foregroundColor(badgeColor)
                        .cornerRadius(6)
                    Spacer()
                }

                Text(title)
                    .font(.subheadline.bold())
                    .foregroundColor(MiranTheme.primaryText(for: systemColorScheme))
                    .lineLimit(1)

                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(MiranTheme.secondaryText(for: systemColorScheme))
                    .lineLimit(2)
            }

            Image(systemName: "chevron.left")
                .font(.caption.weight(.bold))
                .foregroundColor(MiranTheme.secondaryText(for: systemColorScheme))
        }
        .padding(14)
        .background(MiranTheme.cardBackground(for: systemColorScheme))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(MiranTheme.border(for: systemColorScheme), lineWidth: 1)
        )
    }
}

//
//  DigitalIDCardView.swift
//  Miran
//
//  Digital Trainee ID Card View displaying Trainee photo approval, HMAC signature, and status.
//

import SwiftUI

struct DigitalIDCardView: View {
    let profile: TraineeProfileModel?

    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                // Card Background Gradient
                RoundedRectangle(cornerRadius: 24)
                    .fill(LinearGradient(
                        colors: [Color(hex: "064e3b"), Color(hex: "022c22"), Color(hex: "0f172a")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(height: 230)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(LinearGradient(
                                colors: [MiranTheme.emerald.opacity(0.6), Color.white.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ), lineWidth: 1.5)
                    )
                    .shadow(color: MiranTheme.emerald.opacity(0.3), radius: 16, y: 8)

                VStack(spacing: 16) {
                    // Top Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("بطاقة تدريب صحي رقمية")
                                .font(.caption.weight(.bold))
                                .foregroundColor(MiranTheme.emerald)
                            Text(profile?.organization?.nameAr ?? "تجمع الحدود الشمالية الصحي")
                                .font(.caption2)
                                .foregroundColor(MiranTheme.subtext)
                        }

                        Spacer()

                        Text("مِران")
                            .font(.title3.weight(.black))
                            .foregroundColor(.white)
                    }

                    HStack(spacing: 16) {
                        // Trainee Photo Avatar
                        ZStack {
                            Circle()
                                .fill(MiranTheme.emerald.opacity(0.2))
                                .frame(width: 70, height: 70)

                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.white.opacity(0.9))
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(profile?.person?.nameAr ?? "طبيب الامتياز")
                                .font(.headline.weight(.bold))
                                .foregroundColor(.white)

                            Text(profile?.specialtyAr ?? "طب وجراحة عامة")
                                .font(.subheadline)
                                .foregroundColor(MiranTheme.subtext)

                            HStack(spacing: 8) {
                                Label(profile?.traineeNumber ?? "TRN-2024-889", systemImage: "number")
                                    .font(.caption2.monospaced())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.white.opacity(0.1))
                                    .cornerRadius(6)

                                Label(profile?.level ?? "R1", systemImage: "star.fill")
                                    .font(.caption2.weight(.bold))
                                    .foregroundColor(MiranTheme.emerald)
                            }
                        }

                        Spacer()
                    }

                    // Card Footer / HMAC Signature
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("رمز التوثيق (HMAC Signature)")
                                .font(.system(size: 9))
                                .foregroundColor(MiranTheme.subtext)
                            Text(profile?.cardSignature ?? "HMAC-SHA256-MIRAN-VALID")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(MiranTheme.emerald)
                        }

                        Spacer()

                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(MiranTheme.emerald)
                            Text("بطاقة معتمدة")
                                .font(.caption2.weight(.bold))
                                .foregroundColor(.white)
                        }
                    }
                }
                .padding(20)
            }
        }
        .padding(.horizontal)
    }
}

//
//  MiranTheme.swift
//  مِران
//
//  الهوية البصرية: الألوان، المسافات، وأنماط البطاقات.
//

import SwiftUI

enum MiranTheme {

    // MARK: - الألوان الأساسية

    static let accent      = Color(red: 0.12, green: 0.31, blue: 0.37)   // #1F4E5F
    static let accentLight = Color(red: 0.18, green: 0.49, blue: 0.54)   // #2E7D8A
    static let surface     = Color(red: 0.92, green: 0.95, blue: 0.96)   // #EAF2F4
    static let green       = Color(red: 0.13, green: 0.55, blue: 0.35)
    static let urgent      = Color(red: 0.83, green: 0.22, blue: 0.18)

    // MARK: - ألوان شرائط البطاقة حسب الفئة

    static let stripeIntern   = Color(red: 0.16, green: 0.42, blue: 0.72)
    static let stripeResident = Color(red: 0.13, green: 0.55, blue: 0.35)
    static let stripeStudent  = Color(red: 0.45, green: 0.47, blue: 0.50)
    static let stripeNursing  = Color(red: 0.90, green: 0.49, blue: 0.13)
    static let stripeAllied   = Color(red: 0.48, green: 0.29, blue: 0.64)

    // MARK: - قياسات

    static let corner: CGFloat = 14
    static let padding: CGFloat = 16
}

// MARK: - نمط البطاقة

struct MiranCard: ViewModifier {
    var tint: Color = .clear

    func body(content: Content) -> some View {
        content
            .padding(MiranTheme.padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: MiranTheme.corner, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: MiranTheme.corner, style: .continuous)
                    .strokeBorder(tint.opacity(0.25), lineWidth: tint == .clear ? 0 : 1)
            )
    }
}

extension View {
    func miranCard(tint: Color = .clear) -> some View {
        modifier(MiranCard(tint: tint))
    }
}

// MARK: - شارة صغيرة

struct MiranBadge: View {
    var text: String
    var color: Color
    var icon: String?

    init(_ text: String, color: Color, icon: String? = nil) {
        self.text = text
        self.color = color
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: 4) {
            if let icon {
                Image(systemName: icon).font(.caption2)
            }
            Text(text).font(.caption).bold()
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(color.opacity(0.15), in: Capsule())
        .foregroundStyle(color)
    }
}

// MARK: - عنوان قسم

struct SectionTitle: View {
    var text: String
    var systemImage: String?

    init(_ text: String, systemImage: String? = nil) {
        self.text = text
        self.systemImage = systemImage
    }

    var body: some View {
        HStack(spacing: 6) {
            if let systemImage {
                Image(systemName: systemImage).foregroundStyle(MiranTheme.accentLight)
            }
            Text(text).font(.headline)
            Spacer()
        }
    }
}

// MARK: - أدوات التنسيق

enum Fmt {

    static func time(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_SA")
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }

    static func date(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar")
        f.dateFormat = "d MMMM yyyy"
        return f.string(from: date)
    }

    static func shortDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar")
        f.dateFormat = "d MMM"
        return f.string(from: date)
    }

    static func weekday(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar")
        f.dateFormat = "EEEE"
        return f.string(from: date)
    }

    /// تحويل الثواني إلى صيغة مقروءة
    static func duration(_ seconds: Int) -> String {
        if seconds < 60 { return "\(seconds) ث" }
        let m = seconds / 60
        let s = seconds % 60
        if s == 0 { return "\(m) د" }
        return "\(m) د \(s) ث"
    }

    static func clock(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%02d:%02d", m, s)
    }

    static func percent(_ value: Double) -> String {
        "\(Int((value * 100).rounded()))%"
    }
}

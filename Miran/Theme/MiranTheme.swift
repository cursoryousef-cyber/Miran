//
//  MiranTheme.swift
//  مِران
//
//  الهوية البصرية: الألوان، المسافات، وأنماط البطاقات.
//

import SwiftUI

enum MiranTheme {
    // MARK: - الألوان الأساسية والمؤسسية
    static let accent      = Color(red: 0.02, green: 0.59, blue: 0.41)   // #059669 Emerald
    static let accentLight = Color(red: 0.05, green: 0.72, blue: 0.53)   // #10b981
    static let emerald     = Color(red: 0.02, green: 0.59, blue: 0.41)   // #059669 Emerald
    static let teal        = Color(red: 0.05, green: 0.58, blue: 0.53)   // #0d9488 Teal
    static let navy        = Color(red: 0.06, green: 0.09, blue: 0.16)   // #0f172a Navy
    static let background  = Color(red: 0.04, green: 0.06, blue: 0.11)   // #0a0f1d Dark
    static let surface     = Color(red: 0.92, green: 0.95, blue: 0.96)
    static let subtext     = Color(red: 0.58, green: 0.64, blue: 0.72)   // #94a3b8
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

extension Color {
    static let amber = Color(red: 0.96, green: 0.62, blue: 0.04)

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 1)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
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

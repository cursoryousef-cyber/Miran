//
//  SharedComponents.swift
//  مِران
//
//  مكونات واجهة مشتركة: الباركود، العدّاد الحي، بطاقات الإحصاء.
//

import SwiftUI
import UIKit
import CoreImage
import CoreImage.CIFilterBuiltins

// MARK: - مولّد الباركود

struct QRCodeView: View {
    let content: String
    var size: CGFloat = 160

    var body: some View {
        Group {
            if let image = Self.generate(content) {
                Image(uiImage: image)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .overlay(Image(systemName: "qrcode").font(.largeTitle).foregroundStyle(.secondary))
            }
        }
        .frame(width: size, height: size)
    }

    static func generate(_ string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        guard let cg = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

// MARK: - صورة المتدرب

struct TraineeAvatar: View {
    var trainee: Trainee
    var size: CGFloat = 54

    var body: some View {
        Group {
            if let data = trainee.photoData, let ui = UIImage(data: data) {
                Image(uiImage: ui)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    trainee.level.stripeColor.opacity(0.18)
                    Text(trainee.initials)
                        .font(.system(size: size * 0.36, weight: .bold))
                        .foregroundStyle(trainee.level.stripeColor)
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(trainee.level.stripeColor.opacity(0.35), lineWidth: 1.5))
    }
}

// MARK: - عدّاد حي

struct LiveTimerText: View {
    var since: Date
    var now: Date
    var prefix: String = ""

    var body: some View {
        let elapsed = max(0, Int(now.timeIntervalSince(since)))
        Text("\(prefix)\(Fmt.clock(elapsed))")
            .font(.system(.body, design: .monospaced))
            .monospacedDigit()
    }
}

// MARK: - بطاقة إحصاء

struct StatTile: View {
    var value: String
    var label: String
    var icon: String
    var color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: icon).foregroundStyle(color)
                Spacer()
            }
            Text(value).font(.title2).bold()
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12).fill(color.opacity(0.10)))
    }
}

// MARK: - صف معلومة

struct InfoRow: View {
    var label: String
    var value: String
    var icon: String?

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if let icon {
                Image(systemName: icon)
                    .frame(width: 20)
                    .foregroundStyle(MiranTheme.accentLight)
            }
            Text(label)
                .foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(value)
                .multilineTextAlignment(.leading)
                .bold()
        }
        .font(.subheadline)
    }
}

// MARK: - شريط تقدم

struct MiranProgressBar: View {
    var value: Double
    var color: Color = MiranTheme.accent

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .trailing) {
                Capsule().fill(color.opacity(0.15))
                Capsule()
                    .fill(color)
                    .frame(width: geo.size.width * min(1, max(0, value)))
            }
        }
        .frame(height: 8)
    }
}

// MARK: - رسالة فارغة

struct EmptyStateView: View {
    var icon: String
    var title: String
    var message: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text(title).font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
    }
}

// MARK: - مقياس دائري للمؤشر

struct ScoreDial: View {
    var score: Int
    var label: String
    var color: Color
    var size: CGFloat = 110

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.15), lineWidth: 12)
            Circle()
                .trim(from: 0, to: CGFloat(score) / 100)
                .stroke(color, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(score)").font(.system(size: size * 0.28, weight: .bold))
                Text(label).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .frame(width: size, height: size)
    }
}

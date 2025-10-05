import { CameraView, useCameraPermissions, type CameraView as CameraViewType } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Mock backend
function mockAnalyze(_photoUris: string[]) {
  return new Promise<{
    skinType: string;
    concerns: string[];
    confidence: number;
    recommendations: string[];
  }>((resolve) => {
    setTimeout(() => {
      resolve({
        skinType: "Combination",
        concerns: ["Dry patches", "Mild acne", "Uneven tone"],
        confidence: 0.86,
        recommendations: [
          "Gentle gel cleanser AM/PM",
          "Niacinamide serum 5% daily",
          "Non-comedogenic moisturizer",
          "SPF 50 broad-spectrum",
        ],
      });
    }, 1400);
  });
}

type SlotLabel = "Front" | "Left" | "Right";
type Slot = { label: SlotLabel; uri: string | null };

export default function IndexScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraViewType | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Three photo slots
  const [photos, setPhotos] = useState<Slot[]>([
    { label: "Front", uri: null },
    { label: "Left", uri: null },
    { label: "Right", uri: null },
  ]);

  // Which slot to capture next when camera is open
  const [captureSlot, setCaptureSlot] = useState(0);

  // Carousel index on preview
  const [currentIndex, setCurrentIndex] = useState(0);

  // Explicit mode toggle: true = show camera, false = preview
  const [captureMode, setCaptureMode] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    skinType: string;
    concerns: string[];
    confidence: number;
    recommendations: string[];
  }>(null);
  const [facing, setFacing] = useState<"front" | "back">("front");

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Camera permission is required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const onCapture = async () => {
    try {
      if (!camRef.current || !isReady) return;
      const photoData = await camRef.current.takePictureAsync({ quality: 1 });
      const uri = (photoData as { uri: string }).uri;
  
      // Save into current slot
      setPhotos((prev) => {
        const next = [...prev];
        next[captureSlot] = { ...next[captureSlot], uri };
        return next;
      });
      setResult(null);
  
      // Compute next empty slot (in order Front->Left->Right)
      const nextEmpty = [0, 1, 2].find((i) => i !== captureSlot && !photos[i]?.uri);
  
      if (nextEmpty !== undefined) {
        // Continue capturing; update target and keep camera visible
        setCaptureSlot(nextEmpty);
        // Optional: brief haptic or on-screen cue like "Now capture Left"
      } else {
        // All three captured; go to preview and show the last captured slot
        setCurrentIndex(captureSlot);
        setCaptureMode(false);
      }
    } catch (e) {
      console.warn("Capture failed:", e);
    }
  };
  

  const onAnalyze = async () => {
    const allUris = photos.map((p) => p.uri).filter(Boolean) as string[];
    if (allUris.length < 3) {
      console.warn("Please capture Front, Left, and Right before analyzing.");
      return;
    }
    setLoading(true);
    try {
      const r = await mockAnalyze(allUris);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const onRetakeAll = () => {
    setPhotos([
      { label: "Front", uri: null },
      { label: "Left", uri: null },
      { label: "Right", uri: null },
    ]);
    setCaptureSlot(0);
    setCurrentIndex(0);
    setResult(null);
    setCaptureMode(true);
  };

  const onPrev = () => setCurrentIndex((i) => (i + 2) % 3);
  const onNext = () => setCurrentIndex((i) => (i + 1) % 3);
  const current = photos[currentIndex];
  const allCaptured = photos.every((p) => !!p.uri);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {captureMode ? (
        // Camera screen (explicitly shown when captureMode === true)
        <View style={{ flex: 1 }}>
          <CameraView
            ref={camRef}
            style={{ flex: 1 }}
            facing={facing}
            onCameraReady={() => setIsReady(true)}
          />
          {/* Static alignment mask overlay */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: "70%",
                aspectRatio: 3 / 4,
                borderRadius: 999,
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.9)",
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            />
            <View
              style={{
                position: "absolute",
                width: "50%",
                height: 2,
                backgroundColor: "rgba(255,255,255,0.9)",
                top: "44%",
                borderRadius: 2,
              }}
            />
            <View style={{ position: "absolute", top: 32, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "700" }}>
                Align face – Capture: {["Front", "Left", "Right"][captureSlot]}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
            >
              <Text style={styles.smallBtnText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.capture, { opacity: isReady ? 1 : 0.5 }]}
              disabled={!isReady}
              onPress={onCapture}
            />
            <View style={{ width: 64 }} />
          </View>
        </View>
      ) : (
        // Preview carousel
        <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24, minHeight: "100%" }}
            showsVerticalScrollIndicator
          >
            {/* Label + arrows */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <TouchableOpacity onPress={onPrev} style={[styles.navBtn]}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={{ color: "white", fontWeight: "700" }}>{current.label}</Text>
              <TouchableOpacity onPress={onNext} style={[styles.navBtn]}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Image or placeholder */}
            {current.uri ? (
              <Image source={{ uri: current.uri }} style={styles.preview} />
            ) : (
              <View style={[styles.preview, { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1f2937" }]}>
                <Text style={{ color: "#9ca3af" }}>No {current.label} photo yet</Text>
              </View>
            )}

            {/* Actions */}
            <View style={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
              {/* Capture/Retake this angle */}
              <TouchableOpacity
                onPress={() => {
                  setCaptureSlot(currentIndex);
                  setCaptureMode(true);
                }}
                style={[styles.primary, { alignSelf: "center", width: "100%", marginTop: 16 }]}
              >
                <Text style={styles.primaryText}>{current.uri ? "Retake This Angle" : "Capture This Angle"}</Text>
              </TouchableOpacity>

              {/* Analyze */}
              {!result && !loading && (
                <TouchableOpacity
                  onPress={onAnalyze}
                  style={[styles.primary, { alignSelf: "center", width: "100%", marginTop: 12, backgroundColor: allCaptured ? "#10b981" : "#374151" }]}
                  disabled={!allCaptured}
                >
                  <Text style={styles.primaryText}>{allCaptured ? "Analyze Skin" : "Capture all 3 photos first"}</Text>
                </TouchableOpacity>
              )}

              {/* Loading */}
              {loading && (
                <View style={[styles.resultCard, { alignSelf: "stretch", marginTop: 16 }]}>
                  <ActivityIndicator color="#6ee7b7" />
                  <Text style={styles.status}>Analyzing…</Text>
                </View>
              )}

              {/* Result */}
              {result && (
                <View style={[styles.resultCard, { alignSelf: "stretch", marginTop: 16 }]}>
                  <Text style={styles.resultTitle}>Skin Analysis</Text>
                  <Text style={styles.resultLine}>Type: {result.skinType}</Text>
                  <Text style={styles.resultLine}>Confidence: {(result.confidence * 100).toFixed(0)}%</Text>
                  <Text style={styles.resultSub}>Concerns</Text>
                  {result.concerns.map((c) => (
                    <Text key={c} style={styles.bullet}>• {c}</Text>
                  ))}
                  <Text style={styles.resultSub}>Recommendations</Text>
                  {result.recommendations.map((r) => (
                    <Text key={r} style={styles.bullet}>• {r}</Text>
                  ))}
                </View>
              )}

              {/* Retake all */}
              <TouchableOpacity onPress={onRetakeAll} style={[styles.secondary, { alignSelf: "center", width: "100%", marginTop: 16 }]}>
                <Text style={styles.secondaryText}>Retake All</Text>
              </TouchableOpacity>

              <Text style={{ color: "#9ca3af", marginTop: 8, textAlign: "center" }}>
                Use ‹ › to switch Front/Left/Right. Tap “Capture/Retake This Angle” to reopen camera for that slot.
              </Text>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" },
  info: { color: "#e5e7eb", marginBottom: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8, marginTop: 12 },
  buttonText: { color: "white", fontWeight: "600" },

  controls: { position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  smallBtn: { width: 64, height: 40, backgroundColor: "rgba(55,43,49,0.8)", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  smallBtnText: { color: "white" },
  capture: { width: 74, height: 74, backgroundColor: "white", borderRadius: 100, borderWidth: 6, borderColor: "#222" },

  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: "#111" },
  primary: { backgroundColor: "#10b981", padding: 14, borderRadius: 10, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "700" },
  secondary: { backgroundColor: "#1f2937", padding: 12, borderRadius: 10, alignItems: "center" },
  secondaryText: { color: "white" },

  resultCard: { backgroundColor: "#111827", padding: 14, borderRadius: 12, gap: 6 },
  resultTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  resultLine: { color: "#d1d5db" },
  resultSub: { color: "#93c5fd", marginTop: 6, fontWeight: "700" },
  bullet: { color: "#e5e7eb" },
  status: { color: "#c7d2fe" },

  navBtn: { width: 44, height: 36, borderRadius: 8, backgroundColor: "#111827", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1f2937" },
  navBtnText: { color: "white", fontSize: 18, fontWeight: "800" },
});

import { CameraView, useCameraPermissions, type CameraView as CameraViewType } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Mock backend
function mockAnalyze(_photoUri: string | undefined) {
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

export default function IndexScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraViewType | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
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
      // use takePictureAsync per Expo docs
      const photoData = await camRef.current.takePictureAsync({ quality: 1 });
      setPhoto(photoData as { uri: string });
      setResult(null);
    } catch (e) {
      console.warn("Capture failed:", e);
    }
  };

  const onAnalyze = async () => {
    setLoading(true);
    try {
      const r = await mockAnalyze(photo?.uri);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const onRetake = () => {
    setPhoto(null);
    setResult(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {!photo ? (
        <View style={{ flex: 1 }}>
          <CameraView
            ref={camRef}
            style={{ flex: 1 }}
            facing={facing}
            onCameraReady={() => setIsReady(true)}
          />
          {/* Static alignment mask overlay (Option A: drawn shape) */}
<View
  pointerEvents="none"
  style={{
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  }}
>
  {/* Elliptical/rounded face guide */}
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
  {/* Optional forehead/eye guide line */}
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
</View>
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
        <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
          <ScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{ padding: 16, paddingBottom: 24, minHeight: "100%" }}
  showsVerticalScrollIndicator
>
  {/* Top: the preview image */}
  <Image source={{ uri: photo.uri }} style={styles.preview} />

  {/* Spacer that fills remaining vertical space below the image */}
  <View style={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
    {!result && !loading && (
      <TouchableOpacity
        onPress={onAnalyze}
        style={[styles.primary, { alignSelf: "center", width: "100%", marginTop: 16 }]}
      >
        <Text style={styles.primaryText}>Analyze Skin</Text>
      </TouchableOpacity>
    )}

    {loading && (
      <View style={[styles.resultCard, { alignSelf: "stretch", marginTop: 16 }]}>
        <ActivityIndicator color="#6ee7b7" />
        <Text style={styles.status}>Analyzing…</Text>
      </View>
    )}

    {result && (
      <View style={[styles.resultCard, { alignSelf: "stretch", marginTop: 16 }]}>
        <Text style={styles.resultTitle}>Skin Analysis</Text>
        <Text style={styles.resultLine}>Type: {result.skinType}</Text>
        <Text style={styles.resultLine}>
          Confidence: {(result.confidence * 100).toFixed(0)}%
        </Text>
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

    <TouchableOpacity
      onPress={onRetake}
      style={[styles.secondary, { alignSelf: "center", width: "100%", marginTop: 16 }]}
    >
      <Text style={styles.secondaryText}>Retake</Text>
    </TouchableOpacity>
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
});

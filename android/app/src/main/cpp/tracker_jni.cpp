// The bridge between Kotlin and the C++ grade engine.
//
// It offers one function, the same one the laptop backend uses through
// `tracker --engine`: tracker text in, one JSON report out. Keeping the bridge
// this narrow means the engine needs no Android-specific code at all.
//
// Text crosses the bridge as UTF-8 bytes, not as a Java string. JNI's own string
// functions use a modified UTF-8 that breaks on some characters (for example
// emoji in a unit name), and bytes avoid that problem completely.
#include <jni.h>

#include <string>

#include "tracker/report.hpp"

extern "C" JNIEXPORT jbyteArray JNICALL
Java_io_github_sih2006_companion_core_NativeEngine_report(JNIEnv* env, jobject /* this */, jbyteArray input) {
    const jsize length = env->GetArrayLength(input);
    std::string text(static_cast<std::size_t>(length), '\0');
    if (length > 0) env->GetByteArrayRegion(input, 0, length, reinterpret_cast<jbyte*>(&text[0]));

    tracker::Tracker t;
    tracker::LoadReport load = tracker::load_text(text, t);
    const std::string json = tracker::engine_report(t, load);

    jbyteArray out = env->NewByteArray(static_cast<jsize>(json.size()));
    if (out == nullptr) return nullptr;   // out of memory: Java has already been told
    env->SetByteArrayRegion(out, 0, static_cast<jsize>(json.size()), reinterpret_cast<const jbyte*>(json.data()));
    return out;
}

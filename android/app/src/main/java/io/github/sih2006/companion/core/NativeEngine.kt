package io.github.sih2006.companion.core

/**
 * The C++ grade engine, built into the app (see src/main/cpp).
 *
 * Every grade rule (grade bands, GPA, CGPA, WAM, possible, realistic, hurdles) lives
 * in the C++ core. Kotlin never repeats any of it: it sends the stored data as text
 * and reads back one JSON report, exactly as the laptop backend does.
 */
object NativeEngine {
    init {
        System.loadLibrary("tracker")
    }

    /** Tracker text in (format: core/include/tracker/codec.hpp), JSON report out. Both are UTF-8. */
    private external fun report(input: ByteArray): ByteArray

    fun report(text: String): String = String(report(text.toByteArray(Charsets.UTF_8)), Charsets.UTF_8)
}

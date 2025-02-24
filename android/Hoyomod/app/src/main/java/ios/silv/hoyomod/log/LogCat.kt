package ios.silv.hoyomod.log

import android.annotation.SuppressLint
import android.app.Application
import android.content.pm.ApplicationInfo
import android.os.Build
import android.util.Log
import ios.silv.hoyomod.log.AndroidLogcatLogger.Companion.installOnDebuggableApp
import ios.silv.hoyomod.log.LogPriority.DEBUG
import ios.silv.hoyomod.log.LogPriority.ERROR
import ios.silv.hoyomod.log.LogcatLogger.Companion.install
import ios.silv.hoyomod.log.LogcatLogger.Companion.uninstall
import ios.silv.hoyomod.log.LogcatLogger.NoLog.asLog
import ios.silv.hoyomod.log.LogcatLogger.PrintLogger
import java.io.PrintWriter
import java.io.StringWriter
import kotlin.math.min

/**
 *                       /^--^\     /^--^\     /^--^\
 *                       \____/     \____/     \____/
 *                      /      \   /      \   /      \
 * KAT                 |        | |        | |        |
 *                      \__  __/   \__  __/   \__  __/
 * |^|^|^|^|^|^|^|^|^|^|^|^\ \^|^|^|^/ /^|^|^|^|^\ \^|^|^|^|^|^|^|^|^|^|^|^|
 * | | | | | | | | | | | | |\ \| | |/ /| | | | | | \ \ | | | | | | | | | | |
 * ########################/ /######\ \###########/ /#######################
 * | | | | | | | | | | | | \/| | | | \/| | | | | |\/ | | | | | | | | | | | |
 * |_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|
 *
 * SOURCE: https://github.com/square/logcat
 *
 * Copyright 2021 Square Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

private const val MAX_LOG_LENGTH = 4000
private const val MAX_TAG_LENGTH = 23

/**
 * A [logcat] logger that delegates to [android.util.Log] for any log with a priority of
 * at least [minPriorityInt], and is otherwise a no-op.
 *
 * Handles special cases for [LogPriority.ASSERT] (which requires sending to Log.wtf) and
 * splitting logs to be at most 4000 characters per line (otherwise logcat just truncates).
 *
 * Call [installOnDebuggableApp] to make sure you never log in release builds.
 *
 * The implementation is based on Timber DebugTree.
 */
class AndroidLogcatLogger(minPriority: LogPriority = DEBUG) : LogcatLogger {

    private val minPriorityInt: Int = minPriority.priorityInt

    override fun isLoggable(priority: LogPriority): Boolean =
        priority.priorityInt >= minPriorityInt

    @SuppressLint("ObsoleteSdkInt")
    override fun log(
        priority: LogPriority,
        tag: String,
        message: String
    ) {
        // Tag length limit was removed in API 26.
        val trimmedTag = if (tag.length <= MAX_TAG_LENGTH || Build.VERSION.SDK_INT >= 26) {
            tag
        } else {
            tag.substring(0, MAX_TAG_LENGTH)
        }

        if (message.length < MAX_LOG_LENGTH) {
            logToLogcat(priority.priorityInt, trimmedTag, message)
            return
        }

        // Split by line, then ensure each line can fit into Log's maximum length.
        var i = 0
        val length = message.length
        while (i < length) {
            var newline = message.indexOf('\n', i)
            newline = if (newline != -1) newline else length
            do {
                val end = min(newline, i + MAX_LOG_LENGTH)
                val part = message.substring(i, end)
                logToLogcat(priority.priorityInt, trimmedTag, part)
                i = end
            } while (i < newline)
            i++
        }
    }

    private fun logToLogcat(
        priority: Int,
        tag: String,
        part: String
    ) {
        if (priority == Log.ASSERT) {
            Log.wtf(tag, part)
        } else {
            Log.println(priority, tag, part)
        }
    }

    companion object {
        fun installOnDebuggableApp(application: Application, minPriority: LogPriority = DEBUG) {
            if (!LogcatLogger.isInstalled && application.isDebuggableApp) {
                LogcatLogger.install(AndroidLogcatLogger(minPriority))
            }
        }
    }
}

/**
 * A tiny Kotlin API for cheap logging on top of Android's normal `Log` class.
 *
 * The [logcat] function has 3 parameters: an optional [priority], an optional [tag], and a required
 * string producing lambda ([message]). The lambda is only evaluated if a logger is installed and
 * the logger deems the priority loggable.
 *
 * The priority defaults to [LogPriority.DEBUG].
 *
 * The tag defaults to the class name of the log call site, without any extra runtime cost. This works
 * because [logcat] is an inlined extension function of [Any] and has access to [this] from which
 * it can extract the class name. If logging from a standalone function which has no [this], use the
 * [logcat] overload which requires a tag parameter.
 *
 * The [logcat] function does not take a [Throwable] parameter. Instead, the library provides
 * a Throwable extension function: [asLog] which returns a loggable string.
 *
 * ```
 * import logcat.LogPriority.INFO
 * import logcat.asLog
 * import logcat.logcat
 *
 * class MouseController {
 *
 *   fun play {
 *     var state = "CHEEZBURGER"
 *     logcat { "I CAN HAZ $state?" }
 *     // logcat output: D/MouseController: I CAN HAZ CHEEZBURGER?
 *
 *     logcat(INFO) { "DID U ASK 4 MOAR INFO?" }
 *     // logcat output: I/MouseController: DID U ASK 4 MOAR INFO?
 *
 *     logcat { exception.asLog() }
 *     // logcat output: D/MouseController: java.lang.RuntimeException: FYLEZ KERUPTED
 *     //                        at sample.MouseController.play(MouseController.kt:22)
 *     //                        ...
 *
 *     logcat("Lolcat") { "OH HI" }
 *     // logcat output: D/Lolcat: OH HI
 *   }
 * }
 * ```
 *
 * To install a logger, see [LogcatLogger].
 */
inline fun Any.logcat(
    priority: LogPriority = DEBUG,
    /**
     * If provided, the log will use this tag instead of the simple class name of `this` at the call
     * site.
     */
    tag: String? = null,
    message: () -> String
) {
    LogcatLogger.logger.let { logger ->
        if (logger.isLoggable(priority)) {
            val tagOrCaller = tag ?: outerClassSimpleNameInternalOnlyDoNotUseKThxBye()
            logger.log(priority, tagOrCaller, message())
        }
    }
}

/**
 * An overload for logging that does not capture the calling code as tag. This should only
 * be used in standalone functions where there is no `this`.
 * @see logcat above
 */
inline fun logcat(
    tag: String,
    priority: LogPriority = DEBUG,
    message: () -> String
) {
    with(LogcatLogger.logger) {
        if (isLoggable(priority)) {
            log(priority, tag, message())
        }
    }
}

/**
 * Logger that [logcat] delegates to. Call [install] to install a new logger, the default is a
 * no-op logger. Calling [uninstall] falls back to the default no-op logger.
 *
 * You should install [AndroidLogcatLogger] on Android and [PrintLogger] on a JVM.
 */
interface LogcatLogger {

    /**
     * Whether a log with the provided priority should be logged and the corresponding message
     * providing lambda evaluated. Called by [logcat].
     */
    fun isLoggable(priority: LogPriority) = true

    /**
     * Write a log to its destination. Called by [logcat].
     */
    fun log(
        priority: LogPriority,
        tag: String,
        message: String
    )

    companion object {
        @Volatile
        @PublishedApi
        internal var logger: LogcatLogger = NoLog
            private set

        @Volatile
        private var installedThrowable: Throwable? = null

        val isInstalled: Boolean
            get() = installedThrowable != null

        /**
         * Installs a [LogcatLogger].
         *
         * It is an error to call [install] more than once without calling [uninstall] in between,
         * however doing this won't throw, it'll log an error to the newly provided logger.
         */
        fun install(logger: LogcatLogger) {
            synchronized(this) {
                if (isInstalled) {
                    logger.log(
                        ERROR,
                        "LogcatLogger",
                        "Installing $logger even though a logger was previously installed here: " +
                                installedThrowable!!.asLog()
                    )
                }
                installedThrowable = RuntimeException("Previous logger installed here")
                Companion.logger = logger
            }
        }

        /**
         * Replaces the current logger (if any) with a no-op logger.
         */
        fun uninstall() {
            synchronized(this) {
                installedThrowable = null
                logger = NoLog
            }
        }
    }


    /**
     * Utility to turn a [Throwable] into a loggable string.
     *
     * The implementation is based on Timber.getStackTraceString(). It's different
     * from [android.util.Log.getStackTraceString] in the following ways:
     * - No silent swallowing of UnknownHostException.
     * - The buffer size is 256 bytes instead of the default 16 bytes.
     */
    fun Throwable.asLog(): String {
        val stringWriter = StringWriter(256)
        val printWriter = PrintWriter(stringWriter, false)
        printStackTrace(printWriter)
        printWriter.flush()
        return stringWriter.toString()
    }

    /**
     * A [LogcatLogger] that always logs and delegates to [println] concatenating
     * the tag and message, separated by a space. Alternative to [AndroidLogcatLogger]
     * when running on a JVM.
     */
    object PrintLogger : LogcatLogger {

        override fun log(priority: LogPriority, tag: String, message: String) {
            println("$tag $message")
        }
    }

    private object NoLog : LogcatLogger {
        override fun isLoggable(priority: LogPriority) = false

        override fun log(
            priority: LogPriority,
            tag: String,
            message: String
        ) = error("Should never receive any log")
    }
}

@PublishedApi
internal fun Any.outerClassSimpleNameInternalOnlyDoNotUseKThxBye(): String {
    val javaClass = this::class.java
    val fullClassName = javaClass.name
    val outerClassName = fullClassName.substringBefore('$')
    val simplerOuterClassName = outerClassName.substringAfterLast('.')
    return if (simplerOuterClassName.isEmpty()) {
        fullClassName
    } else {
        simplerOuterClassName.removeSuffix("Kt")
    }
}

enum class LogPriority(
    val priorityInt: Int
) {
    VERBOSE(2),
    DEBUG(3),
    INFO(4),
    WARN(5),
    ERROR(6),
    ASSERT(7);
}

private val Application.isDebuggableApp: Boolean
    get() = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

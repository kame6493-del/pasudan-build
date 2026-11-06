# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# パスダン: R8 を入れたときの保険(vc5)
# Capacitor は JS との橋渡しとプラグインの登録をリフレクションで行うので、本体とプラグインは丸ごと残す
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.revenuecat.purchases.capacitor.** { *; }
-keep class com.revenuecat.purchases.hybridcommon.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

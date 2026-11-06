package jp.pasudan.app;

import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** 端末の文字サイズは画面の文字にも反映するが、150% までにする(2026-10-24)。
     *  最大(200%)のままだとショップの札や画面の下のタブがはみ出す。150% までは画面の側ではみ出さない作りにしてある。 */
    private static final int MAX_TEXT_ZOOM = 150;

    @Override
    public void onResume() {
        super.onResume();
        applyTextZoom();
    }

    private void applyTextZoom() {
        if (getBridge() == null) return;
        WebView web = getBridge().getWebView();
        if (web == null) return;
        float scale = getResources().getConfiguration().fontScale;
        int zoom = Math.round(scale * 100f);
        web.getSettings().setTextZoom(Math.max(85, Math.min(MAX_TEXT_ZOOM, zoom)));
    }
}

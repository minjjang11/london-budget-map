package com.maimo.app;

import android.os.Bundle;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        // Skip icon zoom/fade — goes straight to post-splash theme / Capacitor splash.
        splashScreen.setOnExitAnimationListener(splashScreenView -> splashScreenView.remove());
    }
}

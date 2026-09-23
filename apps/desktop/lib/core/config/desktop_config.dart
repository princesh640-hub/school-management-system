import 'package:flutter/material.dart';

class DesktopConfig {
  static const String appName = 'School Management System (Desktop)';
  static const String defaultBaseUrl = 'http://localhost:4000';
  static const Size initialWindowSize = Size(1280, 800);
  static const Size minWindowSize = Size(960, 600);

  final String apiBaseUrl;

  const DesktopConfig({
    this.apiBaseUrl = defaultBaseUrl,
  });
}

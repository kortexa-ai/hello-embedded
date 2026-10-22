# Current Electrobun client compatibility

Issue: https://github.com/kortexa-ai/hello-embedded/issues/1
Dependency: https://github.com/kortexa-ai/electrobun/issues/5

Align Hutch and Cottontail with the current WPE port, and derive the local
Electrobun version from its selected native devkit. Keep the published bootstrap
and vanilla version pin: current source versions may not be on npm yet.
Preserve one application source and both published vanilla and
sibling WPE devkit build lanes. Validate typecheck, startup tests, both builds
and the WPE panel runtime, including navigation, chrome and screenshots.

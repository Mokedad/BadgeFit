# Adds BadgeFit's own plugins (the .swift files beside this one) to the iPhone app for the build:
# each file into App/App and the App target, and its registration into MainViewController.swift.
#   WebAuthPlugin   the sign-in sheet over the app
#   RunCuesPlugin   Hayden with the screen locked (frontend/src/lib/police/pocket.js)
#   HaydenEarPlugin Hayden hearing you: Apple's speech recognition (frontend/src/lib/police/native-ear.js)
# Run by scripts/ios/badgefit-brand.sh on the Mac runner; the committed project stays openGym's.
require 'xcodeproj'
require 'fileutils'

PLUGINS = %w[WebAuthPlugin RunCuesPlugin HaydenEarPlugin]
dir = File.expand_path('../../../frontend/ios/App', __dir__)
proj = Xcodeproj::Project.open(File.join(dir, 'App.xcodeproj'))
app = proj.targets.find { |t| t.name == 'App' }
abort 'no App target' unless app
group = proj.main_group.children.find { |g| g.respond_to?(:path) && g.path == 'App' }
abort 'no App group' unless group

main = File.join(dir, 'App', 'MainViewController.swift')
src = File.read(main)
anchor = 'bridge?.registerPluginInstance(DeviceAuthPlugin())'
abort 'MainViewController.swift: no place to register the plugins' unless src.include?(anchor)

PLUGINS.each do |name|
  file = "#{name}.swift"
  FileUtils.cp(File.join(__dir__, file), File.join(dir, 'App', file))
  app.add_file_references([group.new_file(file)]) unless group.files.any? { |f| f.path == file }
  src = src.sub(anchor, "#{anchor}\n        bridge?.registerPluginInstance(#{name}())") unless src.include?("#{name}()")
  puts "#{name} is in the app"
end
proj.save
File.write(main, src)

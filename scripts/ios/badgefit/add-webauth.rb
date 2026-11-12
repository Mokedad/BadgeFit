# Adds BadgeFit's sign-in sheet plugin (WebAuthPlugin.swift, beside this file) to the iPhone app
# for the build: the file into App/App and the App target, and its registration into
# MainViewController.swift. Run by scripts/ios/badgefit-brand.sh on the Mac runner; the committed
# project stays openGym's.
require 'xcodeproj'
require 'fileutils'

dir = File.expand_path('../../../frontend/ios/App', __dir__)
FileUtils.cp(File.join(__dir__, 'WebAuthPlugin.swift'), File.join(dir, 'App', 'WebAuthPlugin.swift'))

proj = Xcodeproj::Project.open(File.join(dir, 'App.xcodeproj'))
app = proj.targets.find { |t| t.name == 'App' }
abort 'no App target' unless app
group = proj.main_group.children.find { |g| g.respond_to?(:path) && g.path == 'App' }
abort 'no App group' unless group
unless group.files.any? { |f| f.path == 'WebAuthPlugin.swift' }
  app.add_file_references([group.new_file('WebAuthPlugin.swift')])
  proj.save
end

main = File.join(dir, 'App', 'MainViewController.swift')
src = File.read(main)
unless src.include?('WebAuthPlugin()')
  anchor = 'bridge?.registerPluginInstance(DeviceAuthPlugin())'
  abort 'MainViewController.swift: no place to register the plugin' unless src.include?(anchor)
  File.write(main, src.sub(anchor, "#{anchor}\n        bridge?.registerPluginInstance(WebAuthPlugin())"))
end
puts 'WebAuthPlugin is in the app'

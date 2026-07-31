#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'

path = ARGV.fetch(0, 'packages/contracts/openapi/platform-api.yaml')
document = YAML.safe_load_file(path, aliases: true)
errors = []

errors << 'openapi version must be present' unless document['openapi'].is_a?(String)
errors << 'paths must be an object' unless document['paths'].is_a?(Hash)
errors << 'components must be an object' unless document['components'].is_a?(Hash)

operations = %w[get post put patch delete options head trace]
(document['paths'] || {}).each do |route, path_item|
  unless route.start_with?('/') && path_item.is_a?(Hash)
    errors << "invalid path item: #{route}"
    next
  end
  path_parameters = path_item['parameters']
  errors << "#{route} path parameters must be an array" if path_parameters && !path_parameters.is_a?(Array)
  operations.each do |method|
    operation = path_item[method]
    next unless operation
    unless operation.is_a?(Hash)
      errors << "#{method.upcase} #{route} must be an object"
      next
    end
    errors << "#{method.upcase} #{route} requires operationId" unless operation['operationId'].is_a?(String)
    parameters = operation['parameters']
    errors << "#{method.upcase} #{route} parameters must be an array" if parameters && !parameters.is_a?(Array)
    responses = operation['responses']
    errors << "#{method.upcase} #{route} requires responses" unless responses.is_a?(Hash) && !responses.empty?
  end
end

security_schemes = document.dig('components', 'securitySchemes')
errors << 'components.securitySchemes must be an object' unless security_schemes.is_a?(Hash)
schemas = document.dig('components', 'schemas')
errors << 'components.schemas must be an object' unless schemas.is_a?(Hash)

if errors.empty?
  puts "OpenAPI contract structure is valid: #{path}"
  exit 0
end

warn errors.map { |error| "- #{error}" }.join("\n")
exit 1

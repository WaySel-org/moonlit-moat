{{- define "mm.name" -}}{{ .Chart.Name }}{{- end -}}
{{- define "mm.fullname" -}}{{ printf "%s" .Release.Name | trunc 63 | trimSuffix "-" }}{{- end -}}
{{- define "mm.labels" -}}
app.kubernetes.io/name: {{ include "mm.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}
{{- define "mm.selector" -}}
app.kubernetes.io/name: {{ include "mm.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

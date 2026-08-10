const { AndroidConfig, createRunOncePlugin } = require('expo/config-plugins');

// O expo-image-picker declara READ_EXTERNAL_STORAGE/WRITE_EXTERNAL_STORAGE no
// AndroidManifest.xml dele como fallback para Android < 13. A partir do
// Android 13 (API 33) o app usa o seletor de fotos do sistema (Photo Picker),
// que não exige nenhuma permissão de armazenamento. O Google Play, porém,
// mapeia essas permissões legadas para o equivalente READ_MEDIA_IMAGES /
// READ_MEDIA_VIDEO e sinaliza isso na política de "seletores de sistema
// alternativos para fotos/vídeos". Como o app não precisa de acesso amplo à
// galeria (só abre o seletor do sistema para anexar uma foto por vez),
// bloqueamos essas permissões do manifesto final gerado pelo EAS Build.
const withBlockMediaPermissions = (config) => {
  return AndroidConfig.Permissions.withBlockedPermissions(config, [
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ]);
};

module.exports = createRunOncePlugin(withBlockMediaPermissions, 'withBlockMediaPermissions', '1.0.0');

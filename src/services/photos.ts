/**
 * Servicio de fotos (escudos de equipos y fotos de jugadores).
 *
 * Persistencia elegida: "archivo local + expo-file-system".
 *  - iOS/Android: la imagen seleccionada se copia a `Paths.document/avatars`
 *    (directorio de documentos, NO se limpia por el sistema) y se guarda su
 *    ruta `file://` en el store (AsyncStorage). El archivo sobrevive reinicios.
 *  - Web: el picker devuelve la imagen como data URI base64 (los `file://`
 *    no existen en navegador); se guarda esa data URI directamente.
 *  - Limitaciones conocidas: en web no se usa la cámara; desinstalar la app
 *    elimina los archivos locales. Cuando se encienda Supabase, el archivo
 *    `file://` ya sirve como origen para subir a Storage.
 */

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { isSupabaseConfigured, supabase } from './supabase';
import { newUuid } from './uuid';

/** Carpeta donde se copian las fotos persistidas (bajo documentos). */
const AVATARS_DIR_NAME = 'avatars';

export type PhotoSource = 'gallery' | 'camera';

function avatarsDirectory(): Directory {
  return new Directory(Paths.document, AVATARS_DIR_NAME);
}

/** Devuelve true si la URI apunta a uno de nuestros archivos persistidos. */
function isOwnPersistedFile(uri: string): boolean {
  if (!uri.startsWith('file://')) return false;
  return uri.startsWith(new Directory(Paths.document).uri);
}

/** Decodifica base64 (sin dependencias) a bytes para subir a Storage. */
function base64ToBytes(b64: string): Uint8Array {
  const table =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of clean) {
    const idx = table.indexOf(ch);
    if (idx === -1) continue;
    acc = (acc << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Abre el selector (galería o cámara) y devuelve el asset elegido,
 * o `null` si el usuario canceló. Recorte cuadrado + compresión 0.5
 * para mantener tamaños razonables en AsyncStorage/local.
 *
 * Se pide `base64` en todas las plataformas: además de alimentar el camino
 * web, sirve como mecanismo de persistencia FIABLE en nativo (escribir los
 * bytes directamente a disco, sin carreras) y como respaldo si la copia
 * del archivo fuente falla.
 */
export async function pickPhoto(
  source: PhotoSource,
): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === 'camera' && Platform.OS === 'web') {
    // La cámara no está soportada en web.
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

/**
 * Persiste el asset elegido y devuelve la URI final
 * (ruta `file://` en nativo, data URI en web).
 *
 * Estrategia en nativo:
 *  1. Se escribe el `base64` del picker directamente a un archivo en
 *     `Paths.document/avatars` (escritura síncrona y determinista; evita la
 *     carrera de leer el archivo antes de que termine una copia asíncrona).
 *  2. Si no viniera `base64`, se hace una copia del archivo fuente, esta vez
 *     ESPERANDO su promesa (antes no se esperaba y la imagen quedaba vacía).
 *  3. Respaldo final: si el archivo quedó vacío o sin contenido, se devuelve
 *     el `base64` como data URI (funciona en cualquier plataforma).
 */
export async function persistPhoto(
  asset: ImagePicker.ImagePickerAsset,
  prefix: string,
): Promise<string> {
  // En modo backend las fotos se suben al bucket público `avatars` de
  // Supabase Storage (así cualquier visitante las ve). El `base64` del
  // picker ya viene pedido en todas las plataformas.
  if (isSupabaseConfigured && supabase && asset.base64) {
    try {
      const path = `${prefix}-${newUuid()}.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, base64ToBytes(asset.base64), {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: true,
      });
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
      }
      console.warn(
        '[photos] Upload a Storage falló; usando persistencia local:',
        error.message,
      );
    } catch (err) {
      console.warn('[photos] Upload a Storage falló; usando persistencia local', err);
    }
  }

  if (Platform.OS === 'web') {
    if (asset.base64) {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      return `data:${mimeType};base64,${asset.base64}`;
    }
    // Fallback extremo: web sin base64 devuelve blob (puede no persistir).
    return asset.uri;
  }

  const dir = avatarsDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  // El `base64` nativo siempre es JPEG; el ext del source original solo se
  // conserva para el fallback de copia.
  const ext = asset.base64 ? '.jpg' : Paths.extname(asset.uri) || '.jpg';
  const destination = dir.createFile(`${prefix}-${Date.now()}${ext}`, asset.mimeType ?? null);

  if (asset.base64) {
    destination.write(asset.base64, { encoding: 'base64' });
  } else {
    const source = new File(asset.uri);
    await source.copy(destination);
  }

  // Si por cualquier motivo el archivo quedó vacío, resiliencia: data URI.
  if (asset.base64 && destination.size === 0) {
    try {
      destination.delete();
    } catch {
      // best-effort
    }
    return `data:image/jpeg;base64,${asset.base64}`;
  }

  return destination.uri;
}

/**
 * Borra best-effort una foto: si es URL del bucket `avatars` la borra de
 * Supabase Storage; si es archivo persistido localmente, lo borra del disco.
 * Las data URIs y las rutas ajenas se ignoran; los errores no se propagan.
 */
export async function removePhoto(uri: string | null | undefined): Promise<void> {
  if (!uri) return;

  // URL de Supabase Storage: .../storage/v1/object/public/avatars/<path>
  const storageMatch = uri.match(/\/object\/public\/([^/]+)\/(.+)$/);
  if (storageMatch && supabase) {
    try {
      await supabase.storage.from(storageMatch[1]).remove([storageMatch[2]]);
    } catch {
      // Borrado best-effort: nunca debe romper la UI.
    }
    return;
  }

  if (!isOwnPersistedFile(uri)) return;
  try {
    new File(uri).delete();
  } catch {
    // Borrado best-effort: nunca debe romper la UI.
  }
}
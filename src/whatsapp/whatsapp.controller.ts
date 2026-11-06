import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { EnviarMensajeDto } from './dto/send-message.dto';
import { EnviarImagenDto } from './dto/send-image.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import express from 'express';
import { EnviarDocumentoDto } from './dto/send-document.dto';
import { Public } from 'src/auth/decorators/auth_public.decorator';
@ApiTags('WhatsApp Gateway')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // 1. GET http://localhost:3000/api/whatsapp/connect (Muestra el QR en el navegador)
  @Public()
  @Get('connect/view')
  @ApiOperation({
    summary: 'Visualizar el Código QR',
    description:
      'Renderiza el código QR actual de Baileys para vincular tu dispositivo móvil.',
  })
  async renderQrPagev2(@Res() res: express.Response) {
    const estado = await this.whatsappService.obtenerEstado();

    if (!estado.qrBase64) {
      res.type('html').send(`
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="refresh" content="60">
          <title>Estado de WhatsApp</title>
        </head>
        <body style="text-align: center; font-family: sans-serif; margin-top: 50px; padding: 20px;">
            <h2>${estado.mensaje}</h2>
            <p style="color: #667781;">Esta página se actualiza automáticamente cada 60 segundos.</p>
        </body>
        </html>
      `);
      return;
    }

    res.type('html').send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="60">
        <title>Vincular WhatsApp</title>
      </head>
      <body style="font-family: sans-serif; text-align: center; background-color: #f0f2f5; padding: 24px;">
          <div style="background: white; display: inline-block; padding: 24px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 100%; box-sizing: border-box;">
              <h1 style="color: #128C7E; font-size: clamp(20px, 5vw, 28px);">Vincular WhatsApp</h1>
              <img src="${estado.qrBase64}" alt="Código QR de WhatsApp" style="width: min(80vw, 420px); height: auto; aspect-ratio: 1 / 1; object-fit: contain; display: block; margin: 0 auto;"/>
              <p style="color: #667781; font-size: 14px;">Escanea el código desde WhatsApp. Se actualiza automáticamente cada 60 segundos.</p>
          </div>
      </body>
      </html>
    `);
    return;
  }

  @Get('connect')
  @ApiOperation({
    summary: 'Visualizar el Código QR',
    description: 'Renderiza el código QR en Base64 o un mensaje de éxito.',
  })
  async renderQrPage() {
    return this.whatsappService.obtenerEstado();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Estado de la sesión de WhatsApp',
    description:
      'Devuelve el estado real de la conexión, el QR vigente y los datos del dispositivo vinculado.',
  })
  async getStatus() {
    return this.whatsappService.obtenerEstado();
  }

  @Get('qr')
  @ApiOperation({
    summary: 'Obtener el código QR vigente',
    description:
      'Devuelve el QR actual y el estado de la conexión para refrescarlo periódicamente.',
  })
  async getQr() {
    return this.whatsappService.obtenerEstado();
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar la sesión de WhatsApp',
    description:
      'Desvincula el dispositivo, elimina las credenciales locales y genera un nuevo QR.',
  })
  async logout() {
    return this.whatsappService.cerrarSesionWhatsapp();
  }

  @Post('session/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar una sesión defectuosa',
    description:
      'Fuerza el cierre del socket, elimina toda la carpeta de autenticación y genera una sesión nueva.',
  })
  async resetSession() {
    return this.whatsappService.reiniciarSesionWhatsapp();
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desvincular WhatsApp (compatibilidad)',
    description:
      'Alias de cierre de sesión para la pantalla antigua de vinculación.',
  })
  async disconnect() {
    return this.whatsappService.cerrarSesionWhatsapp();
  }
  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK) // Cambia el default de POST (201) a 200 OK de forma nativa
  @ApiOperation({
    summary: 'Enviar mensaje de texto',
    description: 'Despacha un texto plano por WhatsApp.',
  })
  @ApiBody({ type: EnviarMensajeDto })
  async sendMessage(@Body() body: EnviarMensajeDto) {
    body.phone = body.code + body.phone;
    const result = await this.whatsappService.enviarMensajeTexto(
      body.phone,
      body.message,
    );

    // Solo retornas el objeto y NestJS hace toda la magia del envío HTTP
    return {
      success: true,
      message: 'Mensaje enviado con éxito',
      data: result,
    };
  }

  @Public()
  @Post('send-image')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Enviar un archivo de imagen real',
    description: 'Sube una imagen desde tu máquina y envíala por WhatsApp.',
  })
  // TRUCO DE SWAGGER: Forzamos la estructura combinada del DTO de texto + el archivo binario
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: '591',
          description: 'Código de país.',
        },
        phone: {
          type: 'string',
          example: '71234567',
          description: 'Número de destino.',
        },
        caption: {
          type: 'string',
          example: 'Imagen de prueba',
          description: 'Pie de foto opcional.',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Selecciona el archivo de imagen (.png, .jpg)',
        },
      },
      required: ['phone', 'file'], // 'file' y 'phone' son obligatorios
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // <-- 5 MB en bytes. Si pesa más de esto, NestJS tira un 400 automáticamente
      },
    }),
  )
  async sendImage(
    @Body() body: EnviarImagenDto, // Nest valida phone y caption aquí limpiamente sin chocar
    @UploadedFile() file: any, // Nest captura el binario aquí
  ) {
    if (!file) {
      throw new BadRequestException(
        'Es obligatorio subir un archivo de imagen.',
      );
    }
    body.phone = body.code + body.phone;
    const result = await this.whatsappService.enviarImagenDesdeBuffer(
      body.phone,
      file.buffer,
      file.mimetype,
      body.caption,
    );

    return {
      success: true,
      message: 'Archivo de imagen enviado con éxito',
      data: result,
    };
  }

  // <-- Importa el nuevo DTO

  // ... dentro de tu WhatsappController ...
  @Public()
  @Post('send-document')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Enviar cualquier tipo de documento',
    description:
      'Sube un archivo (PDF, DOCX, ZIP, etc.) y envíalo por WhatsApp.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: '591',
          description: 'Código de país.',
        },
        phone: {
          type: 'string',
          example: '71234567',
          description: 'Número de destino.',
        },
        fileName: {
          type: 'string',
          example: 'Factura_Mayo.pdf',
          description: 'Nombre opcional con el que se guardará el archivo.',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Selecciona el documento a enviar',
        },
      },
      required: ['phone', 'file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 15 * 1024 * 1024, // <-- Límite de 15 MB para documentos
      },
    }),
  )
  async sendDocument(
    @Body() body: EnviarDocumentoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // Validamos el tamaño de manera estricta (Ej: 15 MB)
          new MaxFileSizeValidator({
            maxSize: 15 * 1024 * 1024,
            message:
              'El archivo es demasiado pesado. El límite máximo permitido es de 15 MB.',
          }),
        ],
      }),
    )
    file: any,
  ) {
    body.phone = body.code + body.phone;
    console.log(`El archivo pesa exactamente: ${file.size} bytes`);
    if (!file) {
      throw new BadRequestException('Es obligatorio adjuntar un archivo.');
    }

    // Enviamos el buffer, el tipo MIME original y el nombre del archivo
    const result = await this.whatsappService.enviarDocumentoDesdeBuffer(
      body.phone,
      file.buffer,
      file.mimetype,
      body.fileName || file.originalname, // Si el usuario no define un nombre, usamos el nombre real del archivo subido
    );

    return {
      success: true,
      message: 'Documento enviado con éxito',
      data: result,
    };
  }
  @Public()
  @Post('send-to-group')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar mensaje de texto exclusivo a un grupo',
    description:
      'Envía un comunicado directamente a un grupo utilizando su JID oficial (@g.us).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          example: '120363319482736451@g.us',
          description: 'El JID del grupo capturado desde la consola.',
        },
        message: {
          type: 'string',
          example: 'Estimados asegurados, este es un comunicado oficial.',
          description: 'Contenido del mensaje.',
        },
      },
      required: ['groupId', 'message'],
    },
  })
  async sendToGroup(@Body() body: { groupId: string; message: string }) {
    // Validamos en la frontera que no vengan vacíos
    if (!body.groupId || !body.message) {
      throw new BadRequestException(
        'Los campos groupId y message son obligatorios.',
      );
    }

    const result = await this.whatsappService.enviarMensajeAGrupo(
      body.groupId,
      body.message,
    );

    return {
      success: true,
      message: 'Comunicado enviado al grupo con éxito',
      data: result,
    };
  }

  // ... dentro de tu WhatsappController ...
  @Public()
  @Get('list-groups')
  @ApiOperation({
    summary: 'Listar todos los grupos del bot',
    description:
      'Devuelve una lista con los nombres y JIDs (@g.us) de todos los grupos donde está el número corporativo.',
  })
  async getGroups() {
    const grupos = await this.whatsappService.listarMisGrupos();
    return {
      success: true,
      data: grupos,
    };
  }

  // 2. GET http://localhost:3000/api/whatsapp/view (Muestra el formulario visual de envío)
  @Public()
  @Get('view')
  renderSendPage(@Res() res: express.Response) {
    return res.send(`
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Panel NestJS - WhatsApp</title>
          <style>
              body { font-family: sans-serif; background-color: #f0f2f5; padding-top: 50px; text-align: center; }
              .card { background: white; display: inline-block; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: left; width: 400px; }
              h1 { color: #128C7E; font-size: 24px; text-align: center; }
              .phone-container { display: flex; gap: 10px; margin-bottom: 15px; }
              select { width: 40%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
              input[type="text"] { width: 60%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
              textarea { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; height: 100px; }
              button { width: 100%; background-color: #25D366; color: white; border: none; padding: 12px; font-weight: bold; border-radius: 5px; cursor: pointer; }
              #status { margin-top: 15px; font-weight: bold; text-align: center; }
          </style>
      </head>
      <body>
          <div class="card">
              <h1>💬 Enviar Mensaje (NestJS)</h1>
              <form id="msgForm">
                  <div class="phone-container">
                      <select id="countryCode">
                          <option value="591" selected>Bolivia (+591)</option>
                          <option value="51">Perú (+51)</option>
                          <option value="54">Argentina (+54)</option>
                          <option value="52">México (+52)</option>
                      </select>
                      <input type="text" id="phone" placeholder="Ej: 71234567" required>
                  </div>
                  <textarea id="message" placeholder="Escribe tu mensaje..." required></textarea>
                  <button type="submit">Enviar Mensaje</button>
              </form>
              <div id="status"></div>
          </div>
          <script>
              document.getElementById('msgForm').addEventListener('submit', async (e) => {
                  e.preventDefault();
                  const countryCode = document.getElementById('countryCode').value;
                  const localPhone = document.getElementById('phone').value;
                  const message = document.getElementById('message').value;
                  const statusDiv = document.getElementById('status');
                  
                  const fullPhone = countryCode + localPhone.replace(/[^0-9]/g, '');
                  statusDiv.innerText = 'Enviando...';

                  try {
                      //http://localhost:3000/api/whatsapp/send
                      // Apunta al endpoint POST controlado por NestJS
                      const response = await fetch('/api/whatsapp/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code: countryCode, phone: localPhone, message })
                      });
                      const data = await response.json();
                      if (response.ok) {
                          statusDiv.style.color = 'green';
                          statusDiv.innerText = '✅ ¡Mensaje enviado con éxito!';
                          document.getElementById('message').value = '';
                      } else {
                          statusDiv.style.color = 'red';
                          statusDiv.innerText = '❌ Error: ' + data.message;
                      }
                  } catch (err) {
                      statusDiv.style.color = 'red';
                      statusDiv.innerText = '❌ Error de conexión.';
                  }
              });
          </script>
      </body>
      </html>
    `);
  }

  // ... dentro de tu WhatsappController ...
}

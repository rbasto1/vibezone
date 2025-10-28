export function html(jsonData: unknown, assetsJson: unknown) {
  return `<html>
  <head>
    <title>ChatGPT Data Export</title>
    <style>
      body {
        margin: 20px;
      }
      h4 {
        font-family: sans-serif;
        margin: 0;
      }
      #root {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .conversation {
        border: 1px solid black;
        padding: 20px;
        background-color: #f3f3f3;
      }
      .message {
        white-space: pre-wrap;
        margin: 20px 0;
      }
      .author {
        font-weight: bold;
        margin-bottom: 4px;
      }
      .author::first-letter {
        text-transform: uppercase;
      }
    </style>
    <script>
      var jsonData = ${JSON.stringify(jsonData)};
      var assetsJson = ${JSON.stringify(assetsJson)};

      function getConversationMessages(conversation) {
          var messages = [];
          var currentNode = conversation.current_node;
          while (currentNode != null) {
              var node = conversation.mapping[currentNode];
              if (
                  node.message &&
                  node.message.content &&
                  node.message.content.parts &&
                  node.message.content.parts.length > 0 &&
                  (node.message.author.role !== "system"  || node.message.metadata.is_user_system_message)
              ) {
                  author = node.message.author.role;
                  if (author === "assistant" || author === "tool") {
                      author = "ChatGPT";
                  } else if (author === "system" && node.message.metadata.is_user_system_message) {
                      author = "Custom user info"
                  }
                  if (node.message.content.content_type == "text" || node.message.content.content_type == "multimodal_text") {
                    var parts = [];
                    for (var i = 0; i < node.message.content.parts.length; i++) {
                      var part = node.message.content.parts[i];
                      if (typeof part === "string" && part.length > 0) {
                        parts.push({text: part});
                      } else if (part.content_type == "audio_transcription") {
                        parts.push({transcript: part.text});
                      } else if (part.content_type == "audio_asset_pointer" || part.content_type == "image_asset_pointer" || part.content_type == "video_container_asset_pointer") {
                        parts.push({asset: part});
                      } else if (part.content_type == "real_time_user_audio_video_asset_pointer") {
                        if (part.audio_asset_pointer) {
                          parts.push({asset: part.audio_asset_pointer});
                        }
                        if (part.video_container_asset_pointer) {
                          parts.push({asset: part.video_container_asset_pointer});
                        }
                        for (var j = 0; j < part.frames_asset_pointers.length; j++) {
                          parts.push({asset: part.frames_asset_pointers[j]});
                        }
                      }
                    }
                    var metadata = node.message.metadata || {};
                    if (Array.isArray(metadata.attachments)) {
                      for (var a = 0; a < metadata.attachments.length; a++) {
                        var attachment = metadata.attachments[a];
                        if (attachment && attachment.id) {
                          parts.push({ attachment: attachment });
                        }
                      }
                    }
                    if (parts.length > 0) {
                      messages.push({ author, parts: parts });
                    }
                  }
              }
              currentNode = node.parent;
          }
          return messages.reverse();
      }

      // on load, add messages to the root div
      window.onload = function() {
          var root = document.getElementById("root");
          for (var i = 0; i < jsonData.length; i++) {
              var conversation = jsonData[i];
              var messages = getConversationMessages(conversation);
              var div = document.createElement("div");
              div.className = "conversation";
              div.innerHTML = "<h4>" + conversation.title + "</h4>";
              for (var j = 0; j < messages.length; j++) {
                  var message = document.createElement("pre");
                  message.className = "message";
                  message.innerHTML = \`<div class="author">\${messages[j].author}</div>\`;
                  if (messages[j].parts) {
                    for (var k = 0; k < messages[j].parts.length; k++) {
                      var part = messages[j].parts[k];
                      if (part.text) {
                        message.innerHTML += \`<div>\${part.text}</div>\`;
                      } else if (assetsJson) {
                        if (part.transcript) {
                          message.innerHTML += \`<div>[Transcript]: \${part.transcript}</div>\`;
                        } else if (part.asset) {
                          var link = assetsJson[part.asset.asset_pointer];
                          if (link) {
                            message.innerHTML += \`<div>[File]: <a href="\${link}">\${link}</a></div>\`;
                          } else {
                            message.innerHTML += \`<div>[File]: -Deleted-</div>\`;
                          }
                        } else if (part.attachment) {
                          var attachmentLink = assetsJson[part.attachment.id];
                          var attachmentName = part.attachment.name || part.attachment.id;
                          if (attachmentLink) {
                            message.innerHTML += \`<div>[Attachment]: <a href="\${attachmentLink}">\${attachmentName}</a></div>\`;
                          } else {
                            message.innerHTML += \`<div>[Attachment]: \${attachmentName} (missing)</div>\`;
                          }
                        }
                      }
                    }
                  }
                  div.appendChild(message);
              }
              root.appendChild(div);
          }
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}
